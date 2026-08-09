#!/usr/bin/env bash
# Build and publish the API and web container images to Docker Hub.
# Usage: bash scripts/deploy.sh [production|development]

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

DEPLOY_TARGET="${1:-production}"
DEPLOY_ENV_FILE=".env.deploy.${DEPLOY_TARGET}"

if [[ ! -f "$DEPLOY_ENV_FILE" ]]; then
  echo "error: ${DEPLOY_ENV_FILE} not found" >&2
  echo "copy .env.deploy.example to ${DEPLOY_ENV_FILE} and fill it in" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$DEPLOY_ENV_FILE"
set +a

: "${DOCKERHUB_USERNAME:?set DOCKERHUB_USERNAME in ${DEPLOY_ENV_FILE}}"
: "${DOCKERHUB_TOKEN:?set DOCKERHUB_TOKEN in ${DEPLOY_ENV_FILE}}"
: "${NEXT_PUBLIC_API_URL:?set NEXT_PUBLIC_API_URL in ${DEPLOY_ENV_FILE}}"

API_IMAGE_NAME="${API_IMAGE_NAME:-${DOCKERHUB_USERNAME}/image-everything-api}"
WEB_IMAGE_NAME="${WEB_IMAGE_NAME:-${DOCKERHUB_USERNAME}/image-everything-web}"
BUILD_PLATFORMS="${BUILD_PLATFORMS:-linux/amd64,linux/arm64}"
RELEASE_SHA="$(git rev-parse --short HEAD)"
RELEASE_DATE="$(date -u +%Y%m%d)"
IMMUTABLE_TAG="${DEPLOY_TARGET}-${RELEASE_DATE}-${RELEASE_SHA}"
CHANNEL_TAG="${DEPLOY_TARGET}"
if [[ "$DEPLOY_TARGET" == "production" ]]; then
  CHANNEL_TAG="latest"
fi

echo "$DOCKERHUB_TOKEN" | docker login \
  --username "$DOCKERHUB_USERNAME" \
  --password-stdin

echo "Building ${API_IMAGE_NAME}:${IMMUTABLE_TAG}"
docker buildx build \
  --platform "$BUILD_PLATFORMS" \
  --file backend/Dockerfile \
  --tag "${API_IMAGE_NAME}:${IMMUTABLE_TAG}" \
  --tag "${API_IMAGE_NAME}:${CHANNEL_TAG}" \
  --provenance=true \
  --push \
  .

echo "Building ${WEB_IMAGE_NAME}:${IMMUTABLE_TAG}"
docker buildx build \
  --platform "$BUILD_PLATFORMS" \
  --file web/Dockerfile \
  --build-arg "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}" \
  --build-arg "NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-}" \
  --tag "${WEB_IMAGE_NAME}:${IMMUTABLE_TAG}" \
  --tag "${WEB_IMAGE_NAME}:${CHANNEL_TAG}" \
  --provenance=true \
  --push \
  .

echo "Published:"
echo "  ${API_IMAGE_NAME}:${IMMUTABLE_TAG}"
echo "  ${API_IMAGE_NAME}:${CHANNEL_TAG}"
echo "  ${WEB_IMAGE_NAME}:${IMMUTABLE_TAG}"
echo "  ${WEB_IMAGE_NAME}:${CHANNEL_TAG}"
