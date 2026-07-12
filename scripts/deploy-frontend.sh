#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

source "${SCRIPT_DIR}/.env"
# shellcheck source=../../identity/shared/clerk-csp.sh
source "${SCRIPT_DIR}/../../identity/shared/clerk-csp.sh"

SECURITY_HEADERS_POLICY_NAME="${SECURITY_HEADERS_POLICY_NAME:-ai-debates-security-headers-${DISTRIBUTION_ID}}"
SECURITY_HEADERS_FUNCTION_NAME="${SECURITY_HEADERS_FUNCTION_NAME:-ai-debates-security-headers}"
SECURITY_HEADERS_POLICY_COMMENT="Security headers for the AI Debates frontend"
SECURITY_HEADERS_FUNCTION_COMMENT="AI Debates viewer-response security headers"
VIEWER_RESPONSE_FUNCTION_TEMPLATE="${SCRIPT_DIR}/cloudfront/debates-viewer-response.js"
CONTENT_SECURITY_POLICY="${CONTENT_SECURITY_POLICY:-${SDEE3_CLERK_CONTENT_SECURITY_POLICY}}"
# shellcheck source=../../identity/scripts/lib/cloudfront-security-headers.sh
source "${SCRIPT_DIR}/../../identity/scripts/lib/cloudfront-security-headers.sh"


write_production_env() {
  local env_file="${SCRIPT_DIR}/../frontend/.env.production"

  cat > "${env_file}" <<EOF
VITE_CONVEX_URL=${VITE_CONVEX_URL:-https://small-spaniel-691.convex.cloud}
VITE_CONVEX_SITE_URL=${VITE_CONVEX_SITE_URL:-https://small-spaniel-691.convex.site}
VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY:-pk_live_Y2xlcmsuc2RlZTMuY29tJA}
VITE_CLERK_SIGN_IN_URL=${VITE_CLERK_SIGN_IN_URL:-https://identity.sdee3.com/sign-in}
VITE_CLERK_SIGN_UP_URL=${VITE_CLERK_SIGN_UP_URL:-https://identity.sdee3.com/sign-up}
VITE_IDENTITY_CONVEX_URL=${VITE_IDENTITY_CONVEX_URL:-https://glad-snake-999.convex.cloud}
EOF
}

echo "=== Building frontend (production env from frontend/.env.production) ==="
write_production_env
pnpm --dir "${REPO_ROOT}/frontend" build --mode production

echo ""
echo "=== Emptying S3 bucket: s3://${BUCKET} ==="
aws s3 rm "s3://${BUCKET}" --recursive --region "${REGION}"

echo ""
echo "=== Uploading long-lived static files ==="
aws s3 sync "${DIST_DIR}" "s3://${BUCKET}" \
  --delete \
  --region "${REGION}" \
  --exclude "assets/*" \
  --exclude "index.html" \
  --exclude "sw.js" \
  --exclude "registerSW.js" \
  --exclude "manifest.webmanifest" \
  --exclude "build-id.txt" \
  --exclude "workbox-*.js" \
  --cache-control "public, max-age=31536000, immutable"

if [[ -d "${DIST_DIR}/assets" ]]; then
  aws s3 cp "${DIST_DIR}/assets" "s3://${BUCKET}/assets" \
    --recursive \
    --region "${REGION}" \
    --cache-control "public, max-age=31536000, immutable"
fi

SHELL_CACHE_CONTROL="no-cache, must-revalidate"
for shell_file in sw.js registerSW.js manifest.webmanifest build-id.txt; do
  if [[ -f "${DIST_DIR}/${shell_file}" ]]; then
    aws s3 cp "${DIST_DIR}/${shell_file}" "s3://${BUCKET}/${shell_file}" \
      --region "${REGION}" \
      --cache-control "${SHELL_CACHE_CONTROL}"
  fi
done

for workbox_file in "${DIST_DIR}"/workbox-*.js; do
  if [[ -f "${workbox_file}" ]]; then
    aws s3 cp "${workbox_file}" "s3://${BUCKET}/$(basename "${workbox_file}")" \
      --region "${REGION}" \
      --cache-control "${SHELL_CACHE_CONTROL}"
  fi
done

echo ""
echo "=== Uploading index.html (no edge cache) ==="
aws s3 cp "${DIST_DIR}/index.html" "s3://${BUCKET}/index.html" \
  --region "${REGION}" \
  --content-type "text/html" \
  --cache-control "no-cache, no-store, must-revalidate"

echo ""
echo "=== Verifying Lambda@Edge code integrity ==="
EXPECTED_HASH=$(sha256sum "${SCRIPT_DIR}/lambda-edge/seo-router.js" | cut -d' ' -f1)
echo "SEO router SHA-256: ${EXPECTED_HASH}"

echo "=== Deploying Lambda@Edge SEO router ==="
"${SCRIPT_DIR}/lambda-edge/deploy.sh"

echo ""
echo "=== Ensuring CloudFront security headers policy ==="
configure_cloudfront_security_headers

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
echo "HTML shell + SW: no-cache | /assets/*: immutable, max-age=31536000"
