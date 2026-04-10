#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="${1:-sheltie}"
IMAGE_TAG="${2:-latest}"

# Ensure submodule is initialized
git submodule update --init

echo "🐕 Building ${IMAGE_NAME}:${IMAGE_TAG} ..."
docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" .

echo "✅ Build complete: ${IMAGE_NAME}:${IMAGE_TAG}"
echo ""
echo "Push to registry:"
echo "  docker push ${IMAGE_NAME}:${IMAGE_TAG}"
echo ""
echo "Deploy on remote host:"
echo "  SHELTIE_IMAGE=${IMAGE_NAME}:${IMAGE_TAG} docker compose up -d"
