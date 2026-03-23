#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="sheltie"
IMAGE_TAG="${1:-latest}"

# Ensure submodule is initialized
git submodule update --init

echo "🐕 Building ${IMAGE_NAME}:${IMAGE_TAG} ..."
docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" .

echo "✅ Build complete: ${IMAGE_NAME}:${IMAGE_TAG}"
echo ""
echo "Run with:"
echo "  docker-compose up -d"
echo "  # or"
echo "  docker run -d -p 8080:8080 -v \$(pwd)/data:/app/data -e ADMIN_PASSWORD=your_password ${IMAGE_NAME}:${IMAGE_TAG}"
echo ""
echo "Deploy to sub-path:"
echo "  docker run -d -p 8080:8080 -e BASE_PATH=/sheltie -e ADMIN_PASSWORD=your_password ${IMAGE_NAME}:${IMAGE_TAG}"
