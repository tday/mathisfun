#!/usr/bin/env bash
# Deploy Monster Math Defenders to S3 + CloudFront.
# 1) cp deploy.config.example deploy.config   2) fill it in   3) ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -f deploy.config ]]; then
  echo "Missing deploy.config — copy deploy.config.example and fill in your bucket/distribution." >&2
  exit 1
fi
# shellcheck disable=SC1091
source deploy.config
: "${BUCKET:?set BUCKET in deploy.config}"
AWS=(aws)
[[ -n "${PROFILE:-}" ]] && AWS+=(--profile "$PROFILE")
[[ -n "${REGION:-}" ]] && AWS+=(--region "$REGION")

SYNC_COMMON=(--exclude '.git/*' --exclude 'tools/*' --exclude 'node_modules/*' \
  --exclude 'deploy.sh' --exclude 'deploy.config*' --exclude 'package.json' \
  --exclude '.gitignore' --exclude 'README.md')

echo "==> Long-cache assets (js, css, icons)"
"${AWS[@]}" s3 sync . "s3://$BUCKET" "${SYNC_COMMON[@]}" \
  --exclude 'index.html' --exclude 'sw.js' --exclude 'manifest.webmanifest' \
  --cache-control 'public,max-age=86400' --delete

echo "==> No-cache entry points (index.html, sw.js, manifest)"
"${AWS[@]}" s3 cp index.html "s3://$BUCKET/index.html" \
  --cache-control 'no-cache' --content-type 'text/html'
"${AWS[@]}" s3 cp sw.js "s3://$BUCKET/sw.js" \
  --cache-control 'no-cache' --content-type 'text/javascript'
"${AWS[@]}" s3 cp manifest.webmanifest "s3://$BUCKET/manifest.webmanifest" \
  --cache-control 'no-cache' --content-type 'application/manifest+json'

if [[ -n "${DISTRIBUTION_ID:-}" ]]; then
  echo "==> CloudFront invalidation"
  "${AWS[@]}" cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" \
    --paths '/index.html' '/sw.js' '/manifest.webmanifest' >/dev/null
fi
echo "Deployed. Remember to bump VERSION in sw.js when shipping big changes."
