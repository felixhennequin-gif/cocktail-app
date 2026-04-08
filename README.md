<p align="center">
  <img src="brand/ecume-logo-light.svg" alt="Écume" width="200" />
</p>

<h1 align="center">Écume</h1>

<p align="center">
  <strong>L'app cocktail communautaire</strong><br>
  Découvrez, créez et partagez vos recettes de cocktails.
</p>

<p align="center">
  <a href="https://cocktail-app.fr">cocktail-app.fr</a> · <a href="https://cocktail-app.fr/recipes">Catalogue</a> · <a href="https://cocktail-app.fr/api-docs">API Docs</a>
</p>

<p align="center">
  <a href="https://github.com/felixhennequin-gif/cocktail-app/actions/workflows/ci.yml"><img src="https://github.com/felixhennequin-gif/cocktail-app/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
</p>

---

## Fonctionnalités

- **Catalogue** — 500+ recettes avec filtres, recherche full-text et tri ([cocktail-app.fr/recipes](https://cocktail-app.fr/recipes))
- **Comptes utilisateurs** — inscription, JWT + refresh token rotation, vérification email
- **Favoris, notes & commentaires** — notez et commentez chaque recette
- **Collections** — organisez vos recettes favorites, collections curées par des experts
- **Bar virtuel** — ajoutez vos bouteilles, voyez les cocktails réalisables ([cocktail-app.fr/bar](https://cocktail-app.fr/bar))
- **Profil de goût** — quiz interactif + recommandations personnalisées
- **Social** — suivez des utilisateurs, fil d'actualité, leaderboard communautaire
- **Journal de dégustation** — gardez une trace de vos cocktails préparés
- **Liste de courses** — consolidée depuis plusieurs recettes
- **Défis communautaires** — participez à des challenges thématiques
- **Mode soirée** — interface simplifiée pour préparer des cocktails en groupe
- **Blog** — articles de mixologie ([cocktail-app.fr/blog](https://cocktail-app.fr/blog))
- **Glossaire** — encyclopédie du cocktail ([cocktail-app.fr/glossary](https://cocktail-app.fr/glossary))
- **Calendrier de l'avent** — 24 cocktails à découvrir en décembre
- **Export PDF** — téléchargez et imprimez vos recettes
- **API publique** — intégrez Écume dans vos projets ([cocktail-app.fr/api-docs](https://cocktail-app.fr/api-docs))
- **PWA** — installable, fonctionne hors-ligne
- **i18n** — français & anglais

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 19 · Vite 7 · React Router 7 · Tailwind v4 |
| Backend | Node.js · Express 5 |
| ORM | Prisma 7 (`@prisma/adapter-pg`) |
| BDD | PostgreSQL |
| Cache | Redis (ioredis) |
| Auth | JWT + refresh token rotation + vérification email |
| Tests | Jest · Supertest (33 suites) |
| CI | GitHub Actions (PostgreSQL 16 + Redis 7, Node 22) |
| Deploy | PM2 · Nginx · Cloudflare Tunnel |

## Lancement rapide

```bash
# Cloner le dépôt
git clone https://github.com/felixhennequin-gif/cocktail-app.git
cd cocktail-app

# Configurer l'environnement
cp backend/.env.example backend/.env
# Remplir les valeurs dans backend/.env (DATABASE_URL, JWT_SECRET, etc.)

# Installer les dépendances
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Appliquer les migrations et lancer
cd backend && npx prisma migrate deploy && npx prisma generate && cd ..
./dev.sh   # Lance backend (port 3000) + frontend (port 5173)
```

L'application est accessible sur [localhost:5173](http://localhost:5173).

## Tests

```bash
cd backend && npm test   # 33 suites, ~290 tests (Jest + Supertest)
```

Les tests d'intégration nécessitent PostgreSQL et Redis. La CI les fournit automatiquement.

## Structure du projet

```
cocktail-app/
├── backend/
│   ├── prisma/          # Schema (33 modèles) + migrations + seeds
│   ├── src/
│   │   ├── controllers/ # 34 controllers
│   │   ├── routes/      # 32 fichiers de routes
│   │   ├── middleware/   # Auth, rate-limit, cache, admin
│   │   ├── services/    # Badges, notifications, email, push, streak
│   │   └── helpers/     # Erreurs standardisées, parsing
│   └── tests/           # 33 fichiers de tests
├── frontend/
│   └── src/
│       ├── pages/       # 39 pages
│       ├── components/  # 25 composants + recipe/ + ui/
│       ├── contexts/    # Auth, Favorites, Toast
│       ├── hooks/       # 6 hooks custom
│       └── i18n/        # fr.json, en.json
├── brand/               # Logos SVG
└── scripts/             # Deploy, webhook, dev server
```

## API publique

Écume expose une API REST publique, documentée ici : [cocktail-app.fr/api-docs](https://cocktail-app.fr/api-docs)

```bash
# Exemple : lister les recettes
curl https://cocktail-app.fr/api/v1/recipes

# Avec une clé API (500 req/min au lieu de 100)
curl -H "x-api-key: YOUR_KEY" https://cocktail-app.fr/api/v1/recipes
```

## Liens

- **Production** : [cocktail-app.fr](https://cocktail-app.fr)
- **Catalogue** : [cocktail-app.fr/recipes](https://cocktail-app.fr/recipes)
- **API Docs** : [cocktail-app.fr/api-docs](https://cocktail-app.fr/api-docs)
- **Blog** : [cocktail-app.fr/blog](https://cocktail-app.fr/blog)
- **Glossaire** : [cocktail-app.fr/glossary](https://cocktail-app.fr/glossary)

## Licence

Projet privé — tous droits réservés.
