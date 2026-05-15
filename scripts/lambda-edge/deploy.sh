#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/../.env"

LAMBDA_FUNCTION_NAME="ai-debates-seo-router"
LAMBDA_ROLE_NAME="ai-debates-lambda-edge-role"
LAMBDA_DIR="${SCRIPT_DIR}"
BUILD_DIR="${ROOT_DIR}/.tmp-lambda-build"
REGION="us-east-1"

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
    --runtime nodejs20.x \
    --role "${ROLE_ARN}" \
    --handler index.handler \
    --zip-file "fileb://${BUILD_DIR}/seo-router.zip" \
    --region "${REGION}" \
    --timeout 5 \
    --memory-size 128 \
    --query 'FunctionArn' \
    --output text
else
  echo "Updating Lambda function code..."
  aws lambda update-function-code \
    --function-name "${LAMBDA_FUNCTION_NAME}" \
    --zip-file "fileb://${BUILD_DIR}/seo-router.zip" \
    --region "${REGION}" \
    --publish \
    --query 'FunctionArn' \
    --output text
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

# ---------------------------------------------------------------------------
# 5. Update CloudFront distribution (associate Lambda@Edge)
# ---------------------------------------------------------------------------
echo "Checking CloudFront distribution ${DISTRIBUTION_ID}..."

# Get current distribution config
CF_CONFIG=$(aws cloudfront get-distribution-config \
  --id "${DISTRIBUTION_ID}" \
  --region "${REGION}" \
  --output json)

ETAG=$(echo "${CF_CONFIG}" | jq -r '.ETag')
CURRENT_CONFIG=$(echo "${CF_CONFIG}" | jq '.DistributionConfig')

# Check if Lambda is already associated
echo "Checking existing Lambda@Edge association..."
EXISTING_ARN=$(echo "${CURRENT_CONFIG}" | jq -r '.DefaultCacheBehavior.LambdaFunctionAssociations.Items[]? | select(.EventType == "origin-request") | .LambdaFunctionARN // empty')

if [ -n "${EXISTING_ARN}" ]; then
  echo "Existing Lambda@Edge origin-request association found: ${EXISTING_ARN}"
  echo "Updating to new version: ${LAMBDA_VERSION_ARN}"
else
  echo "No existing Lambda@Edge association found. Adding new one..."
fi

# Build updated config: replace or add the LambdaFunctionAssociations on DefaultCacheBehavior
UPDATED_CONFIG=$(echo "${CURRENT_CONFIG}" | jq --arg arn "${LAMBDA_VERSION_ARN}" '
  .DefaultCacheBehavior.LambdaFunctionAssociations = {
    Quantity: 1,
    Items: [
      {
        LambdaFunctionARN: $arn,
        EventType: "origin-request",
        IncludeBody: false
      }
    ]
  }
')

echo "Updating CloudFront distribution..."
aws cloudfront update-distribution \
  --id "${DISTRIBUTION_ID}" \
  --distribution-config "${UPDATED_CONFIG}" \
  --if-match "${ETAG}" \
  --region "${REGION}" \
  --output json

# ---------------------------------------------------------------------------
# 6. Cleanup
# ---------------------------------------------------------------------------
rm -rf "${BUILD_DIR}"

echo ""
echo "=== Lambda@Edge deployment complete ==="
echo "Function: ${LAMBDA_FUNCTION_NAME}"
echo "Version:  ${LAMBDA_VERSION}"
echo "ARN:      ${LAMBDA_VERSION_ARN}"
echo "CloudFront Distribution: ${DISTRIBUTION_ID}"
echo ""
# Verify function state after update
echo "Verifying Lambda function state..."
FUNCTION_STATE=$(aws lambda get-function \
  --function-name "${LAMBDA_FUNCTION_NAME}" \
  --region "${REGION}" \
  --query 'Configuration.State' \
  --output text)
echo "Function state: ${FUNCTION_STATE}"

echo "Note: CloudFront distribution updates can take 5-15 minutes to propagate globally."
