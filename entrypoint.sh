#!/bin/sh
set -e

# Replace base path placeholder in static files at runtime
# BASE_PATH="" → root ("/"), BASE_PATH="/sheltie" → sub-path ("/sheltie/")
if [ -n "$BASE_PATH" ]; then
  # Normalize: strip trailing slash, ensure leading slash
  BASE_PATH=$(echo "$BASE_PATH" | sed 's:/*$::; s:^/*:/:')
  find /app/static -type f \( -name '*.html' -o -name '*.js' \) \
    -exec sed -i "s|/__BASE_PATH__/|${BASE_PATH}/|g" {} +
else
  find /app/static -type f \( -name '*.html' -o -name '*.js' \) \
    -exec sed -i "s|/__BASE_PATH__/|/|g" {} +
fi

exec ./sheltie-server
