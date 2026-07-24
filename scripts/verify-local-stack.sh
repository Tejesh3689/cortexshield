#!/usr/bin/env bash
set -e

echo "Starting verification..."

# Check docker compose
echo "Starting containers..."
docker compose -f infra/docker-compose.yml up -d

echo "Checking node dependencies..."
pnpm install

echo "Checking python dependencies..."
uv sync

echo "Verification complete."
