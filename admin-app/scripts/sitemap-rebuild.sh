#!/usr/bin/env bash
set -euo pipefail

: "${SITEMAP_BASE_URL:=http://localhost:3000}"
: "${SITEMAP_SYNC_TOKEN:=}"

echo "Triggering sitemap rebuild against ${SITEMAP_BASE_URL} ..."

curlArgs=(
  -s
  -X POST
  "${SITEMAP_BASE_URL%/}/api/v1/seo/sitemaps"
  -H "Content-Type: application/json"
  -d '{"mode":"rebuild"}'
)

if [[ -n "${SITEMAP_SYNC_TOKEN}" ]]; then
  curlArgs+=( -H "x-internal-token: ${SITEMAP_SYNC_TOKEN}" )
fi

curl "${curlArgs[@]}" >/dev/null
echo "Done."
