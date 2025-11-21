#!/usr/bin/env bash
set -euo pipefail

# Base URL of the running app; override per env.
: "${SITEMAP_BASE_URL:=http://localhost:3000}"
# Optional auth token that the API validates against process.env.SITEMAP_SYNC_TOKEN.
: "${SITEMAP_SYNC_TOKEN:=}"
# How many rows to fetch when verifying the rebuild.
: "${SITEMAP_LIMIT:=5000}"
# Optional minimum count guard; set to e.g. 750 to fail fast if below expectation.
: "${SITEMAP_EXPECTED_MIN:=}"

log() {
  printf '[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

require() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1" >&2; exit 1; }
}

require curl

API_URL="${SITEMAP_BASE_URL%/}/api/v1/seo/sitemaps"

tmp_rebuild="$(mktemp)"
tmp_count="$(mktemp)"
trap 'rm -f "$tmp_rebuild" "$tmp_count"' EXIT

curl_args=( -sS --fail-with-body -H "Content-Type: application/json" )
if [[ -n "${SITEMAP_SYNC_TOKEN}" ]]; then
  curl_args+=( -H "x-internal-token: ${SITEMAP_SYNC_TOKEN}" )
fi

log "Triggering sitemap rebuild at ${API_URL}"
curl "${curl_args[@]}" -X POST -d '{"mode":"rebuild"}' "$API_URL" -o "$tmp_rebuild"

log "Rebuild response:"
if command -v jq >/dev/null 2>&1; then
  jq '.' "$tmp_rebuild" || cat "$tmp_rebuild"
else
  cat "$tmp_rebuild"
fi

log "Fetching sitemap count (limit ${SITEMAP_LIMIT})"
curl -sS --fail-with-body "${API_URL}?limit=${SITEMAP_LIMIT}" -o "$tmp_count"

if command -v jq >/dev/null 2>&1; then
  sitemap_count="$(jq -r '.count // empty' "$tmp_count" 2>/dev/null || true)"
  log "Current sitemap count: ${sitemap_count:-unknown}"
else
  log "Current sitemap payload:"
  cat "$tmp_count"
fi

if [[ -n "${SITEMAP_EXPECTED_MIN}" && -n "${sitemap_count:-}" ]]; then
  if (( sitemap_count < SITEMAP_EXPECTED_MIN )); then
    echo "Sitemap count (${sitemap_count}) is below expected minimum (${SITEMAP_EXPECTED_MIN})." >&2
    exit 1
  fi
fi

log "Done."
