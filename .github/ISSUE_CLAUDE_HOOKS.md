# tooling: Setup Claude Code hooks

## Objectif

Mettre en place 8 hooks Claude Code pour automatiser la qualité du code, la sécurité, et le workflow de développement sur le projet Écume. Ces hooks s'exécutent automatiquement lors des interactions avec Claude Code.

---

## 1. Auto-format (PostToolUse)

Formate automatiquement les fichiers après chaque édition par Claude.

**Script : `scripts/hooks/auto-format.sh`**

```bash
#!/bin/bash
# Hook: auto-format — Formate le fichier après édition
# Trigger: PostToolUse (Edit, Write)

FILE_PATH="$CLAUDE_FILE_PATH"

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

case "$FILE_PATH" in
  *.js|*.jsx)
    npx prettier --write "$FILE_PATH" 2>/dev/null
    ;;
  *.json)
    npx prettier --write "$FILE_PATH" 2>/dev/null
    ;;
  *.css)
    npx prettier --write "$FILE_PATH" 2>/dev/null
    ;;
  *.md)
    npx prettier --write --prose-wrap preserve "$FILE_PATH" 2>/dev/null
    ;;
esac

exit 0
```

---

## 2. Block-dangerous (PreToolUse)

Bloque les commandes destructives (rm -rf, git push --force, DROP TABLE, etc.).

**Script : `scripts/hooks/block-dangerous.sh`**

```bash
#!/bin/bash
# Hook: block-dangerous — Bloque les commandes dangereuses
# Trigger: PreToolUse (Bash)

COMMAND="$CLAUDE_TOOL_INPUT"

# Liste de patterns dangereux
DANGEROUS_PATTERNS=(
  "rm -rf /"
  "rm -rf ~"
  "rm -rf \."
  "git push.*--force.*main"
  "git push.*-f.*main"
  "git reset --hard"
  "git checkout main"
  "git merge.*main"
  "DROP TABLE"
  "DROP DATABASE"
  "TRUNCATE"
  "DELETE FROM.*WHERE 1"
  "pkill"
  "kill -9"
  "chmod 777"
  "npm publish"
  "> /dev/sd"
  "mkfs"
  "dd if="
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qiE "$pattern"; then
    echo "BLOCKED: Commande dangereuse détectée — pattern: $pattern"
    echo "Raison: Cette commande pourrait causer des dommages irréversibles."
    exit 2
  fi
done

exit 0
```

---

## 3. Protect-files (PreToolUse)

Empêche la modification de fichiers critiques (migrations, configs prod, secrets).

**Script : `scripts/hooks/protect-files.sh`**

```bash
#!/bin/bash
# Hook: protect-files — Protège les fichiers critiques
# Trigger: PreToolUse (Edit, Write)

FILE_PATH="$CLAUDE_FILE_PATH"

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Fichiers et dossiers protégés
PROTECTED_PATTERNS=(
  "backend/prisma/migrations/"
  "scripts/deploy.sh"
  "scripts/webhook-server.js"
  "ecosystem.config.js"
  ".github/workflows/"
  ".env"
  ".env.production"
  ".env.local"
  "backend/prisma/schema.prisma"
)

for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if echo "$FILE_PATH" | grep -q "$pattern"; then
    echo "BLOCKED: Fichier protégé — $FILE_PATH"
    echo "Raison: Ce fichier est critique et ne doit pas être modifié sans approbation explicite."
    echo "Demandez confirmation à l'utilisateur avant de modifier ce fichier."
    exit 2
  fi
done

exit 0
```

---

## 4. Tests (PostToolUse)

Lance les tests pertinents après modification d'un fichier backend.

**Script : `scripts/hooks/run-tests.sh`**

```bash
#!/bin/bash
# Hook: tests — Lance les tests après modification backend
# Trigger: PostToolUse (Edit, Write)

FILE_PATH="$CLAUDE_FILE_PATH"

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Ne lancer que pour les fichiers backend
if ! echo "$FILE_PATH" | grep -q "^backend/"; then
  exit 0
fi

# Ignorer les fichiers non-JS
case "$FILE_PATH" in
  *.js) ;;
  *) exit 0 ;;
esac

# Ignorer les seeds et scripts
if echo "$FILE_PATH" | grep -qE "(seed|script|migration)"; then
  exit 0
fi

cd backend

# Trouver le fichier test correspondant
BASENAME=$(basename "$FILE_PATH" .js)

# Mapping controller/route → test
TEST_FILE=""
case "$BASENAME" in
  *-controller|*-routes)
    DOMAIN=$(echo "$BASENAME" | sed 's/-controller$//' | sed 's/-routes$//')
    if [ -f "tests/${DOMAIN}.test.js" ]; then
      TEST_FILE="tests/${DOMAIN}.test.js"
    fi
    ;;
  *)
    if [ -f "tests/${BASENAME}.test.js" ]; then
      TEST_FILE="tests/${BASENAME}.test.js"
    fi
    ;;
esac

if [ -n "$TEST_FILE" ]; then
  echo "Running: npx jest $TEST_FILE --forceExit"
  npx jest "$TEST_FILE" --forceExit --no-coverage 2>&1
  exit $?
fi

exit 0
```

---

## 5. PR Gate (PreToolUse)

Vérifie que tous les tests passent avant un `git push`.

**Script : `scripts/hooks/pr-gate.sh`**

```bash
#!/bin/bash
# Hook: pr-gate — Vérifie les tests avant push
# Trigger: PreToolUse (Bash)

COMMAND="$CLAUDE_TOOL_INPUT"

# Ne s'applique qu'aux git push
if ! echo "$COMMAND" | grep -qE "git push"; then
  exit 0
fi

echo "PR Gate: Vérification avant push..."

# Vérifier qu'on n'est pas sur main
BRANCH=$(git branch --show-current)
if [ "$BRANCH" = "main" ]; then
  echo "BLOCKED: Push sur main interdit. Utilisez dev ou une branche feature."
  exit 2
fi

# Lancer les tests backend
echo "Lancement des tests backend..."
cd backend
npm test 2>&1
TEST_EXIT=$?

if [ $TEST_EXIT -ne 0 ]; then
  echo "BLOCKED: Les tests échouent. Corrigez avant de push."
  exit 2
fi

echo "PR Gate: Tous les tests passent. Push autorisé."
exit 0
```

---

## 6. Lint (PostToolUse)

Lance le linter sur les fichiers modifiés et rapporte les erreurs.

**Script : `scripts/hooks/lint.sh`**

```bash
#!/bin/bash
# Hook: lint — Lint les fichiers modifiés
# Trigger: PostToolUse (Edit, Write)

FILE_PATH="$CLAUDE_FILE_PATH"

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Seulement les fichiers JS/JSX
case "$FILE_PATH" in
  *.js|*.jsx) ;;
  *) exit 0 ;;
esac

if echo "$FILE_PATH" | grep -q "^backend/"; then
  cd backend
  RELATIVE_PATH=$(echo "$FILE_PATH" | sed 's|^backend/||')
  npx eslint "$RELATIVE_PATH" --no-error-on-unmatched-pattern 2>&1
  EXIT_CODE=$?
elif echo "$FILE_PATH" | grep -q "^frontend/"; then
  cd frontend
  RELATIVE_PATH=$(echo "$FILE_PATH" | sed 's|^frontend/||')
  npx eslint "$RELATIVE_PATH" --no-error-on-unmatched-pattern 2>&1
  EXIT_CODE=$?
else
  exit 0
fi

if [ $EXIT_CODE -ne 0 ]; then
  echo "Lint errors detected in $FILE_PATH — please fix before continuing."
fi

# Ne pas bloquer, juste informer
exit 0
```

---

## 7. Logging (PostToolUse)

Log toutes les actions de Claude Code dans un fichier pour audit.

**Script : `scripts/hooks/logging.sh`**

```bash
#!/bin/bash
# Hook: logging — Log les actions Claude Code
# Trigger: PostToolUse (Bash, Edit, Write)

LOG_DIR=".claude/logs"
LOG_FILE="$LOG_DIR/claude-actions-$(date +%Y-%m-%d).log"

mkdir -p "$LOG_DIR"

TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
TOOL="$CLAUDE_TOOL_NAME"
FILE_PATH="$CLAUDE_FILE_PATH"
SESSION="$CLAUDE_SESSION_ID"

# Format du log
{
  echo "[$TIMESTAMP] tool=$TOOL session=$SESSION"
  if [ -n "$FILE_PATH" ]; then
    echo "  file=$FILE_PATH"
  fi
  if [ "$TOOL" = "Bash" ]; then
    echo "  command=$(echo "$CLAUDE_TOOL_INPUT" | head -c 200)"
  fi
  echo "---"
} >> "$LOG_FILE"

exit 0
```

---

## 8. Auto-commit (Notification)

Rappelle de commit après un certain nombre de modifications.

**Script : `scripts/hooks/auto-commit-reminder.sh`**

```bash
#!/bin/bash
# Hook: auto-commit-reminder — Rappel de commit après modifications
# Trigger: Notification (PostToolUse sur Edit/Write)

COUNTER_FILE="/tmp/claude-edit-counter-$$"

# Incrémenter le compteur
if [ -f "$COUNTER_FILE" ]; then
  COUNT=$(cat "$COUNTER_FILE")
else
  COUNT=0
fi

COUNT=$((COUNT + 1))
echo "$COUNT" > "$COUNTER_FILE"

# Rappeler après 10 modifications
if [ "$COUNT" -ge 10 ]; then
  CHANGED=$(git diff --stat 2>/dev/null | tail -1)
  echo "Reminder: $COUNT fichiers modifiés depuis le dernier commit."
  echo "État: $CHANGED"
  echo "Pensez à commiter vos changements avec un message conventional commit."
  echo 0 > "$COUNTER_FILE"
fi

exit 0
```

---

## Configuration complète : `settings.json`

À placer dans `.claude/settings.json` (projet) ou `~/.claude/settings.json` (global) :

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash scripts/hooks/block-dangerous.sh",
            "description": "Bloque les commandes destructives (rm -rf, force push, DROP TABLE...)",
            "blocking": true
          },
          {
            "type": "command",
            "command": "bash scripts/hooks/pr-gate.sh",
            "description": "Vérifie les tests avant git push",
            "blocking": true
          }
        ]
      },
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash scripts/hooks/protect-files.sh",
            "description": "Protège les fichiers critiques (migrations, .env, deploy, CI)",
            "blocking": true
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash scripts/hooks/auto-format.sh",
            "description": "Auto-format avec Prettier après édition"
          },
          {
            "type": "command",
            "command": "bash scripts/hooks/lint.sh",
            "description": "Lint ESLint sur les fichiers modifiés"
          },
          {
            "type": "command",
            "command": "bash scripts/hooks/run-tests.sh",
            "description": "Lance les tests pertinents après modification backend"
          },
          {
            "type": "command",
            "command": "bash scripts/hooks/logging.sh",
            "description": "Log les actions pour audit"
          },
          {
            "type": "command",
            "command": "bash scripts/hooks/auto-commit-reminder.sh",
            "description": "Rappel de commit après 10 modifications"
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash scripts/hooks/logging.sh",
            "description": "Log les commandes Bash pour audit"
          }
        ]
      }
    ]
  }
}
```

---

## Installation

```bash
# 1. Créer le dossier hooks
mkdir -p scripts/hooks

# 2. Copier chaque script (voir sections ci-dessus)
# 3. Rendre exécutables
chmod +x scripts/hooks/*.sh

# 4. Copier le settings.json
mkdir -p .claude
cp settings.json .claude/settings.json

# 5. Créer le dossier de logs
mkdir -p .claude/logs
echo ".claude/logs/" >> .gitignore
```

## Résumé des hooks

| # | Hook | Trigger | Type | Action |
|---|------|---------|------|--------|
| 1 | **auto-format** | PostToolUse (Edit/Write) | Non-bloquant | Prettier sur le fichier modifié |
| 2 | **block-dangerous** | PreToolUse (Bash) | **Bloquant** | Bloque rm -rf, force push, DROP, etc. |
| 3 | **protect-files** | PreToolUse (Edit/Write) | **Bloquant** | Protège migrations, .env, deploy, CI |
| 4 | **tests** | PostToolUse (Edit/Write) | Non-bloquant | Lance le test correspondant au fichier modifié |
| 5 | **pr-gate** | PreToolUse (Bash) | **Bloquant** | Tests obligatoires avant git push |
| 6 | **lint** | PostToolUse (Edit/Write) | Non-bloquant | ESLint sur le fichier modifié |
| 7 | **logging** | PostToolUse (Bash/Edit/Write) | Non-bloquant | Log toutes les actions dans `.claude/logs/` |
| 8 | **auto-commit** | PostToolUse (Edit/Write) | Non-bloquant | Rappel de commit après 10 modifications |

## Labels suggérés
`tooling`, `developer-experience`, `claude-code`
