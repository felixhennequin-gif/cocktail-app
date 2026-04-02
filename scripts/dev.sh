#!/bin/bash
set -e

ROOT=$(cd "$(dirname "$0")/.." && pwd)
export PATH="$HOME/.local/bin:$PATH"

BACKEND_PID=""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cleanup() {
  echo ""
  echo -e "${YELLOW}Arrêt du dev...${NC}"
  pm2 stop cocktail-api-dev 2>/dev/null || true
  pm2 delete cocktail-api-dev 2>/dev/null || true
  echo "Dev stopped."
  exit 0
}

trap cleanup SIGINT SIGTERM

# Backend dev (PM2 avec watch)
echo -e "${GREEN}Démarrage du backend dev (port 3001)...${NC}"
cd "$ROOT"
NODE_ENV=development pm2 start backend/src/index.js \
  --name cocktail-api-dev \
  --watch backend/src \
  --ignore-watch="node_modules uploads logs"

echo -e "${GREEN}Backend dev démarré sur :3001${NC}"

# Frontend dev (Vite)
echo -e "${GREEN}Démarrage du frontend dev...${NC}"
cd "$ROOT/frontend" && npm run dev

cleanup
