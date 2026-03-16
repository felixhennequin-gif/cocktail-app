#!/bin/bash
set -e

# pm2 est installé dans ~/.local/bin (pas dans le PATH système)
export PATH="$HOME/.local/bin:$PATH"

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$APP_DIR/logs/deploy.log"

echo "=== Déploiement $(date) ===" >> "$LOG_FILE"

cd "$APP_DIR"

# Basculer sur main et récupérer les dernières modifications
git fetch origin main >> "$LOG_FILE" 2>&1
git checkout main >> "$LOG_FILE" 2>&1
git reset --hard origin/main >> "$LOG_FILE" 2>&1

# Install des dépendances backend (production uniquement)
cd backend
npm ci --omit=dev >> "$LOG_FILE" 2>&1

# Migrations Prisma puis regénération du client
npx prisma migrate deploy >> "$LOG_FILE" 2>&1
npx prisma generate >> "$LOG_FILE" 2>&1

# Build du frontend React
cd "$APP_DIR/frontend"
npm ci >> "$LOG_FILE" 2>&1
npm run build >> "$LOG_FILE" 2>&1

cd "$APP_DIR"

# Redémarrer uniquement l'API (inclut désormais le frontend statique dans dist/)
# NE PAS redémarrer webhook ni cloudflared (boucle infinie)
pm2 restart cocktail-api >> "$LOG_FILE" 2>&1

echo "=== Déploiement terminé $(date) ===" >> "$LOG_FILE"
