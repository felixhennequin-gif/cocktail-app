<p align="center">
  <img src="brand/ecume-icon.svg" alt="Écume" width="48" />
</p>

<h1 align="center">Écume</h1>

<p align="center">
  <strong>The community cocktail app</strong> · <strong>L'app cocktail communautaire</strong><br>
  Discover, create and share cocktail recipes.<br>
  Découvrez, créez et partagez vos recettes de cocktails.
</p>

<p align="center">
  <a href="https://cocktail-app.fr">cocktail-app.fr</a> · <a href="https://cocktail-app.fr/recipes">Recipes</a> · <a href="https://cocktail-app.fr/api-docs">API Docs</a>
</p>

<p align="center">
  <a href="https://github.com/felixhennequin-gif/cocktail-app/actions/workflows/ci.yml"><img src="https://github.com/felixhennequin-gif/cocktail-app/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
</p>

---

## Features · Fonctionnalités

- **Recipe catalogue · Catalogue** — 500+ recipes with full-text search, filters and sorting ([cocktail-app.fr/recipes](https://cocktail-app.fr/recipes))
- **User accounts · Comptes** — sign up, JWT + refresh token rotation, email verification
- **Favorites, ratings & comments · Favoris, notes & commentaires** — rate and review every recipe
- **Collections** — organize your favorites, expert-curated collections
- **Virtual bar · Bar virtuel** — add your bottles, see which cocktails you can make ([cocktail-app.fr/bar](https://cocktail-app.fr/bar))
- **Taste profile · Profil de goût** — interactive quiz + personalized recommendations
- **Social** — follow users, activity feed, community leaderboard
- **Tasting journal · Journal de dégustation** — keep track of the cocktails you've made
- **Shopping list · Liste de courses** — consolidated from multiple recipes
- **Community challenges · Défis** — join themed cocktail challenges
- **Party mode · Mode soirée** — simplified UI for making cocktails in a group
- **Blog** — mixology articles ([cocktail-app.fr/blog](https://cocktail-app.fr/blog))
- **Glossary · Glossaire** — cocktail encyclopedia ([cocktail-app.fr/glossary](https://cocktail-app.fr/glossary))
- **Advent calendar · Calendrier de l'avent** — 24 cocktails to discover every December
- **PDF export** — download and print your recipes
- **Public API · API publique** — integrate Écume into your projects ([cocktail-app.fr/api-docs](https://cocktail-app.fr/api-docs))
- **PWA** — installable, works offline · installable, fonctionne hors-ligne
- **i18n** — French & English · Français & Anglais

## Tech stack · Stack technique

| Layer · Couche | Technology · Technologie |
|----------------|--------------------------|
| Frontend | React 19 · Vite 7 · React Router 7 · Tailwind v4 |
| Backend | Node.js · Express 5 |
| ORM | Prisma 7 (`@prisma/adapter-pg`) |
| Database · BDD | PostgreSQL |
| Cache | Redis (ioredis) |
| Auth | JWT + refresh token rotation + email verification |
| Tests | Jest · Supertest (33 suites) |
| CI | GitHub Actions (PostgreSQL 16 + Redis 7, Node 22) |
| Deploy | PM2 · Nginx · Cloudflare Tunnel |

## Getting started · Lancement rapide

```bash
# Clone the repository · Cloner le dépôt
git clone https://github.com/felixhennequin-gif/cocktail-app.git
cd cocktail-app

# Set up environment · Configurer l'environnement
cp backend/.env.example backend/.env
# Fill in values · Remplir les valeurs (DATABASE_URL, JWT_SECRET, etc.)

# Install dependencies · Installer les dépendances
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Run migrations and start · Appliquer les migrations et lancer
cd backend && npx prisma migrate deploy && npx prisma generate && cd ..
./dev.sh   # backend (port 3000) + frontend (port 5173)
```

The app is available at [localhost:5173](http://localhost:5173).
L'application est accessible sur [localhost:5173](http://localhost:5173).

## Tests

```bash
cd backend && npm test   # 33 suites, ~290 tests (Jest + Supertest)
```

Integration tests require PostgreSQL and Redis. CI provides them automatically.
Les tests d'intégration nécessitent PostgreSQL et Redis. La CI les fournit automatiquement.

## Project structure · Structure du projet

```
cocktail-app/
├── backend/
│   ├── prisma/          # Schema (33 models) + migrations + seeds
│   ├── src/
│   │   ├── controllers/ # 34 controllers
│   │   ├── routes/      # 32 route files · fichiers de routes
│   │   ├── middleware/   # Auth, rate-limit, cache, admin
│   │   ├── services/    # Badges, notifications, email, push, streaks
│   │   └── helpers/     # Standardized errors · Erreurs standardisées
│   └── tests/           # 33 test files · fichiers de tests
├── frontend/
│   └── src/
│       ├── pages/       # 39 pages
│       ├── components/  # 25 components · composants + recipe/ + ui/
│       ├── contexts/    # Auth, Favorites, Toast
│       ├── hooks/       # 6 custom hooks
│       └── i18n/        # fr.json, en.json
├── brand/               # SVG logos
└── scripts/             # Deploy, webhook, dev server
```

## Public API · API publique

Écume exposes a public REST API · Écume expose une API REST publique : [cocktail-app.fr/api-docs](https://cocktail-app.fr/api-docs)

```bash
# List recipes · Lister les recettes
curl https://cocktail-app.fr/api/v1/recipes

# With an API key (500 req/min instead of 100) · Avec une clé API
curl -H "x-api-key: YOUR_KEY" https://cocktail-app.fr/api/v1/recipes
```

## Links · Liens

- **Production** : [cocktail-app.fr](https://cocktail-app.fr)
- **Recipes · Catalogue** : [cocktail-app.fr/recipes](https://cocktail-app.fr/recipes)
- **API Docs** : [cocktail-app.fr/api-docs](https://cocktail-app.fr/api-docs)
- **Blog** : [cocktail-app.fr/blog](https://cocktail-app.fr/blog)
- **Glossary · Glossaire** : [cocktail-app.fr/glossary](https://cocktail-app.fr/glossary)

## License · Licence

Private project — all rights reserved. · Projet privé — tous droits réservés.
