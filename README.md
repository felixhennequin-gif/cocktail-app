<p align="center">
  <img src="brand/ecume-icon.svg" alt="Écume" width="48" />
</p>

<h1 align="center">Écume</h1>

<p align="center">
  <strong>The community cocktail app</strong><br>
  Discover, create and share cocktail recipes.
</p>

<p align="center">
  <a href="https://cocktail-app.fr">cocktail-app.fr</a> · <a href="https://cocktail-app.fr/recipes">Recipes</a> · <a href="https://cocktail-app.fr/api-docs">API Docs</a>
</p>

<p align="center">
  <a href="https://github.com/felixhennequin-gif/cocktail-app/actions/workflows/ci.yml"><img src="https://github.com/felixhennequin-gif/cocktail-app/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
</p>

---

## Features

- **Recipe catalogue** — 500+ recipes with full-text search, filters and sorting ([cocktail-app.fr/recipes](https://cocktail-app.fr/recipes))
- **User accounts** — sign up, JWT + refresh token rotation, email verification
- **Favorites, ratings & comments** — rate and review every recipe
- **Collections** — organize your favorites, expert-curated collections
- **Virtual bar** — add your bottles, see which cocktails you can make ([cocktail-app.fr/bar](https://cocktail-app.fr/bar))
- **Taste profile** — interactive quiz + personalized recommendations
- **Social** — follow users, activity feed, community leaderboard
- **Tasting journal** — keep track of the cocktails you've made
- **Shopping list** — consolidated from multiple recipes
- **Community challenges** — join themed cocktail challenges
- **Party mode** — simplified UI for making cocktails in a group
- **Blog** — mixology articles ([cocktail-app.fr/blog](https://cocktail-app.fr/blog))
- **Glossary** — cocktail encyclopedia ([cocktail-app.fr/glossary](https://cocktail-app.fr/glossary))
- **Advent calendar** — 24 cocktails to discover every December
- **PDF export** — download and print your recipes
- **Public API** — integrate Écume into your projects ([cocktail-app.fr/api-docs](https://cocktail-app.fr/api-docs))
- **PWA** — installable, works offline
- **i18n** — French & English

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 · Vite 7 · React Router 7 · Tailwind v4 |
| Backend | Node.js · Express 5 |
| ORM | Prisma 7 (`@prisma/adapter-pg`) |
| Database | PostgreSQL |
| Cache | Redis (ioredis) |
| Auth | JWT + refresh token rotation + email verification |
| Tests | Jest · Supertest (33 suites) |
| CI | GitHub Actions (PostgreSQL 16 + Redis 7, Node 22) |
| Deploy | PM2 · Nginx · Cloudflare Tunnel |

## Getting started

```bash
# Clone the repository
git clone https://github.com/felixhennequin-gif/cocktail-app.git
cd cocktail-app

# Set up environment
cp backend/.env.example backend/.env
# Fill in values in backend/.env (DATABASE_URL, JWT_SECRET, etc.)

# Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Run migrations and start
cd backend && npx prisma migrate deploy && npx prisma generate && cd ..
./dev.sh   # Starts backend (port 3000) + frontend (port 5173)
```

The app is available at [localhost:5173](http://localhost:5173).

## Tests

```bash
cd backend && npm test   # 33 suites, ~290 tests (Jest + Supertest)
```

Integration tests require PostgreSQL and Redis. CI provides them automatically.

## Project structure

```
cocktail-app/
├── backend/
│   ├── prisma/          # Schema (33 models) + migrations + seeds
│   ├── src/
│   │   ├── controllers/ # 34 controllers
│   │   ├── routes/      # 32 route files
│   │   ├── middleware/   # Auth, rate-limit, cache, admin
│   │   ├── services/    # Badges, notifications, email, push, streaks
│   │   └── helpers/     # Standardized errors, parsing
│   └── tests/           # 33 test files
├── frontend/
│   └── src/
│       ├── pages/       # 39 pages
│       ├── components/  # 25 components + recipe/ + ui/
│       ├── contexts/    # Auth, Favorites, Toast
│       ├── hooks/       # 6 custom hooks
│       └── i18n/        # fr.json, en.json
├── brand/               # SVG logos
└── scripts/             # Deploy, webhook, dev server
```

## Public API

Écume exposes a public REST API, documented at [cocktail-app.fr/api-docs](https://cocktail-app.fr/api-docs).

```bash
# List recipes
curl https://cocktail-app.fr/api/v1/recipes

# With an API key (500 req/min instead of 100)
curl -H "x-api-key: YOUR_KEY" https://cocktail-app.fr/api/v1/recipes
```

## Links

- **Production**: [cocktail-app.fr](https://cocktail-app.fr)
- **Recipes**: [cocktail-app.fr/recipes](https://cocktail-app.fr/recipes)
- **API Docs**: [cocktail-app.fr/api-docs](https://cocktail-app.fr/api-docs)
- **Blog**: [cocktail-app.fr/blog](https://cocktail-app.fr/blog)
- **Glossary**: [cocktail-app.fr/glossary](https://cocktail-app.fr/glossary)

## License

Private project — all rights reserved.
