#!/bin/bash

ROOT=$(cd "$(dirname "$0")" && pwd)
BACKEND_PID=""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cleanup() {
  echo ""
  echo -e "${YELLOW}Arrêt des serveurs...${NC}"
  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null
    wait "$BACKEND_PID" 2>/dev/null
  fi
  echo "Bonne journée 👋"
  exit 0
}

trap cleanup SIGINT SIGTERM

# --- Backend ---
echo -e "${GREEN}Démarrage du backend...${NC}"
cd "$ROOT/backend" && npm run dev &
BACKEND_PID=$!

# Laisser le temps au process de s'initialiser
sleep 2

if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
  echo -e "${RED}❌ Le backend a planté au démarrage.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Backend démarré (PID $BACKEND_PID)${NC}"

# Surveiller le backend en arrière-plan : alerter s'il plante après démarrage
(
  # Attendre que le process disparaisse (poll toutes les secondes)
  while kill -0 "$BACKEND_PID" 2>/dev/null; do
    sleep 1
  done
  # Si le script principal tourne encore, c'est un crash inattendu
  if kill -0 "$$" 2>/dev/null; then
    echo ""
    echo -e "${RED}❌ Le backend a planté.${NC}"
    echo -e "${YELLOW}Le frontend continue de tourner. Ctrl+C pour tout arrêter.${NC}"
  fi
) &

# --- Frontend ---
echo -e "${GREEN}Démarrage du frontend...${NC}"
cd "$ROOT/frontend" && npm run dev

FRONTEND_EXIT=$?

# Si le frontend s'arrête sans Ctrl+C
if [ $FRONTEND_EXIT -ne 0 ] && [ $FRONTEND_EXIT -ne 130 ]; then
  echo -e "${RED}❌ Le frontend a planté (code de sortie : $FRONTEND_EXIT).${NC}"
fi

cleanup
