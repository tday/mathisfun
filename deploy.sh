#!/usr/bin/env bash
# Deploy Monster Math Defenders to S3 + CloudFront.
#
#   cp deploy.config.example deploy.config   # fill in your bucket + distribution
#   ./deploy.sh
#
# Two passes, because the caching rules differ:
#   * hashed-by-content-in-practice assets (js/css/icons) -> cached for 5 minutes
#     at the browser but kept a year at the edge, invalidated on every deploy
#   * index.html / sw.js / manifest -> no-cache, so a new service worker is
#     always picked up and can never pin an old build

set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -f deploy.config ]]; then
  echo "Missing deploy.config — copy deploy.config.example and fill it in." >&2
  exit 1
fi
# shellcheck disable=SC1091
source deploy.config

: "${BUCKET:?Set BUCKET in deploy.config}"
: "${DISTRIBUTION_ID:=}"
PREFIX="${PREFIX:-}"
DEST="s3://${BUCKET}${PREFIX:+/$PREFIX}"

command -v aws >/dev/null || { echo "aws CLI not found." >&2; exit 1; }

EXCLUDES=(
  --exclude ".git/*" --exclude "tools/*" --exclude "deploy.sh"
  --exclude "deploy.config*" --exclude ".gitignore" --exclude "*.md"
  --exclude ".DS_Store" --exclude "*.log"
)

echo "==> Uploading long-lived assets to ${DEST}"
aws s3 sync . "$DEST" \
  "${EXCLUDES[@]}" \
  --exclude "index.html" --exclude "sw.js" --exclude "manifest.webmanifest" \
  --cache-control "public, max-age=300, s-maxage=31536000" \
  --delete

echo "==> Uploading entry points with no-cache"
aws s3 cp index.html "$DEST/index.html" \
  --cache-control "no-cache, must-revalidate" --content-type "text/html; charset=utf-8"
aws s3 cp sw.js "$DEST/sw.js" \
  --cache-control "no-cache, must-revalidate" --content-type "text/javascript; charset=utf-8"
aws s3 cp manifest.webmanifest "$DEST/manifest.webmanifest" \
  --cache-control "no-cache, must-revalidate" --content-type "application/manifest+json"

if [[ -n "$DISTRIBUTION_ID" ]]; then
  echo "==> Invalidating CloudFront ${DISTRIBUTION_ID}"
  aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/*" \
    --query 'Invalidation.Id' --output text
else
  echo "No DISTRIBUTION_ID set — skipping CloudFront invalidation."
fi

echo "==> Done."
echo "    Remember to bump VERSION in sw.js when you change gameplay files."
