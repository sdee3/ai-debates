#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/.env"

SECURITY_HEADERS_POLICY_NAME="${SECURITY_HEADERS_POLICY_NAME:-ai-debates-security-headers-${DISTRIBUTION_ID}}"
CONTENT_SECURITY_POLICY="${CONTENT_SECURITY_POLICY:-default-src 'self'; base-uri 'self'; connect-src 'self' https: wss:; font-src 'self' data:; frame-ancestors 'none'; img-src 'self' data: blob: https:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; upgrade-insecure-requests}"

ensure_security_headers_policy() {
  local policy_file
  local policy_id
  local policy_etag

  policy_file="$(mktemp)"
  cat > "${policy_file}" <<EOF
{
  "Name": "${SECURITY_HEADERS_POLICY_NAME}",
  "Comment": "Security headers for the AI Debates frontend",
  "SecurityHeadersConfig": {
    "ContentSecurityPolicy": {
      "Override": true,
      "ContentSecurityPolicy": "${CONTENT_SECURITY_POLICY}"
    },
    "ContentTypeOptions": {
      "Override": true
    },
    "FrameOptions": {
      "FrameOption": "DENY",
      "Override": true
    },
    "ReferrerPolicy": {
      "ReferrerPolicy": "strict-origin-when-cross-origin",
      "Override": true
    },
    "StrictTransportSecurity": {
      "AccessControlMaxAgeSec": 63072000,
      "IncludeSubdomains": true,
      "Preload": true,
      "Override": true
    }
  }
}
EOF

  policy_id="$(aws cloudfront list-response-headers-policies \
    --type custom \
    --query "ResponseHeadersPolicyList.Items[?ResponseHeadersPolicy.ResponseHeadersPolicyConfig.Name=='${SECURITY_HEADERS_POLICY_NAME}'].ResponseHeadersPolicy.Id | [0]" \
    --output text)"

  if [[ "${policy_id}" == "None" ]]; then
    policy_id="$(aws cloudfront create-response-headers-policy \
      --response-headers-policy-config "file://${policy_file}" \
      --query "ResponseHeadersPolicy.Id" \
      --output text)"
  else
    policy_etag="$(aws cloudfront get-response-headers-policy-config \
      --id "${policy_id}" \
      --query "ETag" \
      --output text)"
    aws cloudfront update-response-headers-policy \
      --id "${policy_id}" \
      --if-match "${policy_etag}" \
      --response-headers-policy-config "file://${policy_file}" >/dev/null
  fi

  rm -f "${policy_file}"
  printf '%s' "${policy_id}"
}

attach_security_headers_policy() {
  local policy_id="$1"
  local distribution_config_file
  local distribution_etag

  distribution_config_file="$(mktemp)"
  distribution_etag="$(aws cloudfront get-distribution-config \
    --id "${DISTRIBUTION_ID}" \
    --query "ETag" \
    --output text)"

  aws cloudfront get-distribution-config \
    --id "${DISTRIBUTION_ID}" \
    --query "DistributionConfig" > "${distribution_config_file}"

  python3 - "${distribution_config_file}" "${policy_id}" <<'PY'
import json
import sys

config_path = sys.argv[1]
policy_id = sys.argv[2]

with open(config_path, "r", encoding="utf-8") as handle:
    config = json.load(handle)

config["DefaultCacheBehavior"]["ResponseHeadersPolicyId"] = policy_id

for behavior in config.get("CacheBehaviors", {}).get("Items", []):
    behavior["ResponseHeadersPolicyId"] = policy_id

with open(config_path, "w", encoding="utf-8") as handle:
    json.dump(config, handle)
PY

  aws cloudfront update-distribution \
    --id "${DISTRIBUTION_ID}" \
    --if-match "${distribution_etag}" \
    --distribution-config "file://${distribution_config_file}" >/dev/null

  rm -f "${distribution_config_file}"
}

echo "=== Building frontend (production env from frontend/.env.production) ==="
pnpm --dir ./frontend build --mode production

echo ""
echo "=== Emptying S3 bucket: s3://${BUCKET} ==="
aws s3 rm "s3://${BUCKET}" --recursive --region "${REGION}"

echo ""
echo "=== Uploading dist/ to s3://${BUCKET} ==="
aws s3 sync "${DIST_DIR}" "s3://${BUCKET}" --delete --region "${REGION}"

echo ""
echo "=== Verifying Lambda@Edge code integrity ==="
EXPECTED_HASH=$(sha256sum "${SCRIPT_DIR}/lambda-edge/seo-router.js" | cut -d' ' -f1)
echo "SEO router SHA-256: ${EXPECTED_HASH}"

echo "=== Deploying Lambda@Edge SEO router ==="
"${SCRIPT_DIR}/lambda-edge/deploy.sh"

echo ""
echo "=== Ensuring CloudFront security headers policy ==="
SECURITY_HEADERS_POLICY_ID="$(ensure_security_headers_policy)"
attach_security_headers_policy "${SECURITY_HEADERS_POLICY_ID}"

echo ""
echo "=== Invalidating CloudFront cache ==="
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id "${DISTRIBUTION_ID}" \
  --paths "/*" \
  --region "${REGION}" \
  --query "Invalidation.Id" \
  --output text)

echo "Invalidation created: ${INVALIDATION_ID}"
echo ""
echo "=== Deploy complete ==="
