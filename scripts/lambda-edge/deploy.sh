#!/usr/bin/env bash
set -euo pipefail

# Keep the AWS CLI's pager out of the deploy (see scripts/deploy-frontend.sh).
export AWS_PAGER=""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/../.env"

LAMBDA_FUNCTION_NAME="ai-debates-seo-router"
LAMBDA_ROLE_NAME="ai-debates-lambda-edge-role"
LAMBDA_DIR="${SCRIPT_DIR}"
BUILD_DIR="${ROOT_DIR}/.tmp-lambda-build"
REGION="us-east-1"
LAMBDA_RUNTIME="nodejs24.x"

echo "=== Lambda@Edge SEO Router Deployment ==="

# ---------------------------------------------------------------------------
# 1. Prepare Lambda code (bake in CONVEX_SITE_URL)
# ---------------------------------------------------------------------------
mkdir -p "${BUILD_DIR}"

echo "Baking CONVEX_SITE_URL=${CONVEX_SITE_URL} into Lambda code..."
sed "s/CONVEX_SITE_URL_PLACEHOLDER/${CONVEX_SITE_URL}/g" \
  "${LAMBDA_DIR}/seo-router.js" > "${BUILD_DIR}/index.js"

# Zip the function
cd "${BUILD_DIR}"
zip -q "seo-router.zip" "index.js"
cd - >/dev/null

# ---------------------------------------------------------------------------
# 2. Ensure IAM Role exists
# ---------------------------------------------------------------------------
echo "Checking IAM role: ${LAMBDA_ROLE_NAME}..."
ROLE_ARN=$(aws iam get-role \
  --role-name "${LAMBDA_ROLE_NAME}" \
  --query 'Role.Arn' \
  --output text 2>/dev/null || true)

if [ -z "${ROLE_ARN}" ] || [ "${ROLE_ARN}" = "None" ]; then
  echo "Creating IAM role ${LAMBDA_ROLE_NAME}..."

  TRUST_POLICY='{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": ["lambda.amazonaws.com", "edgelambda.amazonaws.com"]
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }'

  aws iam create-role \
    --role-name "${LAMBDA_ROLE_NAME}" \
    --assume-role-policy-document "${TRUST_POLICY}" \
    --query 'Role.Arn' \
    --output text

  # Attach basic Lambda execution policy
  aws iam attach-role-policy \
    --role-name "${LAMBDA_ROLE_NAME}" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

  # Wait for role to propagate
  echo "Waiting for IAM role to propagate..."
  sleep 10

  ROLE_ARN=$(aws iam get-role \
    --role-name "${LAMBDA_ROLE_NAME}" \
    --query 'Role.Arn' \
    --output text)
else
  echo "IAM role exists: ${ROLE_ARN}"
fi

# ---------------------------------------------------------------------------
# 3. Create or update Lambda function
# ---------------------------------------------------------------------------
echo "Checking Lambda function: ${LAMBDA_FUNCTION_NAME}..."
FUNCTION_ARN=$(aws lambda get-function \
  --function-name "${LAMBDA_FUNCTION_NAME}" \
  --region "${REGION}" \
  --query 'Configuration.FunctionArn' \
  --output text 2>/dev/null || true)

if [ -z "${FUNCTION_ARN}" ] || [ "${FUNCTION_ARN}" = "None" ]; then
  echo "Creating Lambda function ${LAMBDA_FUNCTION_NAME}..."
  aws lambda create-function \
    --function-name "${LAMBDA_FUNCTION_NAME}" \
    --runtime "${LAMBDA_RUNTIME}" \
    --role "${ROLE_ARN}" \
    --handler index.handler \
    --zip-file "fileb://${BUILD_DIR}/seo-router.zip" \
    --region "${REGION}" \
    --timeout 5 \
    --memory-size 128 \
    --query 'FunctionArn' \
    --output text
else
  # Skip the update entirely when the live code already matches what we built:
  # no new version means no pin bump and no CloudFront roll-out.
  LIVE_URL=$(aws lambda get-function \
    --function-name "${LAMBDA_FUNCTION_NAME}" \
    --region "${REGION}" \
    --query 'Code.Location' \
    --output text)
  LIVE_SHA=$(curl -sS "${LIVE_URL}" | funzip | openssl dgst -sha256 -binary | openssl base64)
  NEW_SHA=$(openssl dgst -sha256 -binary "${BUILD_DIR}/index.js" | openssl base64)

  if [ "${LIVE_SHA}" = "${NEW_SHA}" ]; then
    rm -rf "${BUILD_DIR}"
    echo ""
    echo "=== No deployment needed ==="
    echo "Live code already matches (sha256 ${NEW_SHA})."
    echo "No new version published; CloudFront keeps its pinned version."
    exit 0
  fi

  echo "Updating Lambda function code..."
  aws lambda update-function-code \
    --function-name "${LAMBDA_FUNCTION_NAME}" \
    --zip-file "fileb://${BUILD_DIR}/seo-router.zip" \
    --region "${REGION}" \
    --query 'FunctionArn' \
    --output text

  echo "Waiting for Lambda code update..."
  aws lambda wait function-updated \
    --function-name "${LAMBDA_FUNCTION_NAME}" \
    --region "${REGION}"

  # Keep runtime pinned (Node 24+ requires async handlers; see seo-router.js).
  echo "Ensuring Lambda runtime is ${LAMBDA_RUNTIME}..."
  aws lambda update-function-configuration \
    --function-name "${LAMBDA_FUNCTION_NAME}" \
    --runtime "${LAMBDA_RUNTIME}" \
    --region "${REGION}" \
    --output text >/dev/null

  echo "Waiting for Lambda configuration update..."
  aws lambda wait function-updated \
    --function-name "${LAMBDA_FUNCTION_NAME}" \
    --region "${REGION}"
fi

# ---------------------------------------------------------------------------
# 4. Publish a new version (required for Lambda@Edge association)
# ---------------------------------------------------------------------------
echo "Publishing new Lambda version..."
MAX_RETRIES=10
RETRY_DELAY=10
LAMBDA_VERSION_ARN=""
for i in $(seq 1 "${MAX_RETRIES}"); do
  LAMBDA_VERSION_ARN=$(aws lambda publish-version \
    --function-name "${LAMBDA_FUNCTION_NAME}" \
    --region "${REGION}" \
    --query 'FunctionArn' \
    --output text 2>&1) && break

  if echo "${LAMBDA_VERSION_ARN}" | grep -q "ResourceConflictException"; then
    echo "  Update in progress, retrying in ${RETRY_DELAY}s (attempt ${i}/${MAX_RETRIES})..."
    sleep "${RETRY_DELAY}"
    LAMBDA_VERSION_ARN=""
  else
    echo "  Unexpected error: ${LAMBDA_VERSION_ARN}"
    exit 1
  fi
done

if [ -z "${LAMBDA_VERSION_ARN}" ]; then
  echo "  Failed to publish version after ${MAX_RETRIES} attempts."
  exit 1
fi

LAMBDA_VERSION="${LAMBDA_VERSION_ARN##*:}"

# CloudFront needs explicit invoke permission on the published version.
echo "Granting CloudFront permission to invoke ${LAMBDA_VERSION_ARN}..."
STATEMENT_ID="allow-cloudfront-${LAMBDA_VERSION}"
aws lambda add-permission \
  --function-name "${LAMBDA_VERSION_ARN}" \
  --statement-id "${STATEMENT_ID}" \
  --action lambda:InvokeFunction \
  --principal edgelambda.amazonaws.com \
  --source-arn "arn:aws:cloudfront::$(aws sts get-caller-identity --query Account --output text):distribution/${DISTRIBUTION_ID}" \
  --region "${REGION}" 2>/dev/null \
  || echo "  Invoke permission already exists for version ${LAMBDA_VERSION}."

# ---------------------------------------------------------------------------
# 5. Cleanup
# ---------------------------------------------------------------------------
rm -rf "${BUILD_DIR}"

echo ""
echo "=== Lambda@Edge deployment complete ==="
echo "Function: ${LAMBDA_FUNCTION_NAME}"
echo "Version:  ${LAMBDA_VERSION}"
echo "ARN:      ${LAMBDA_VERSION_ARN}"
echo ""
echo "Terraform owns the CloudFront distribution. Bump the pinned version in"
echo "infrastructure/aws/sdee3-frontends/variables.tf, then apply:"
echo ""
echo "  lambda_edge_ai_debates_seo_router = \"${LAMBDA_VERSION_ARN}\""
echo ""
echo "  cd infrastructure/aws/sdee3-frontends && ./tf.sh apply"
echo ""
# Verify function state after update
echo "Verifying Lambda function state..."
FUNCTION_STATE=$(aws lambda get-function \
  --function-name "${LAMBDA_FUNCTION_NAME}" \
  --region "${REGION}" \
  --query 'Configuration.State' \
  --output text)
echo "Function state: ${FUNCTION_STATE}"
