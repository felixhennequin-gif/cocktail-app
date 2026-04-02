#!/bin/bash
export PATH="$HOME/.local/bin:$PATH"

pm2 stop cocktail-api-dev 2>/dev/null || true
pm2 delete cocktail-api-dev 2>/dev/null || true
echo "Dev environment stopped."
