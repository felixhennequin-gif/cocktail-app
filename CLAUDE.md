# Cocktail App — Contexte Claude Code

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 19 + Vite 7 + React Router 7 + Tailwind v4 |
| Backend | Node.js + Express 5 |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| BDD | PostgreSQL (`cocktails_db`) |
| Cache | Redis via `ioredis` |
| Auth | JWT (`jsonwebtoken` + `bcrypt`) |
| Tests | Jest + Supertest |
| Validation | Zod |
| Rate limiting | `express-rate-limit` |

Serveur Debian local : `192.168.1.85`
- API backend : `http://192.168.1.85:3000`
- Frontend dev : `http://192.168.1.85:5173`

## Architecture des dossiers

```
cocktail-app/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Schéma BDD complet
│   │   ├── seed.js              # 10 cocktails de base
│   │   ├── seed-big.js          # Gros dataset
│   │   ├── seed-realistic.js    # Données réalistes
│   │   └── migrations/          # Migrations Prisma auto-générées
│   └── src/
│       ├── index.js             # Entrée Express — monte toutes les routes
│       ├── prisma.js            # Singleton PrismaClient (adapter pg)
│       ├── cache.js             # Middleware cache Redis
│       ├── rateLimiter.js       # Rate limiting (auth strict, général souple)
│       ├── middleware/
│       │   └── auth.js          # requireAuth, requireAdmin, optionalAuth
│       ├── routes/              # Un fichier par domaine
│       ├── controllers/         # Logique métier, un fichier par domaine
│       └── services/
│           └── notification-service.js
├── frontend/
│   └── src/
│       ├── contexts/AuthContext.jsx  # JWT localStorage + authFetch
│       ├── components/              # RecipeCard, SearchBar, FollowButton, NotificationBell
│       └── pages/                   # 11 pages + admin/
├── docs/
│   ├── architecture.md          # Schéma des couches
│   └── decisions/               # ADRs
└── dev.sh                       # Lance backend + frontend en concurrent
```

## Modèles Prisma (schema.prisma)

| Modèle | Champs clés |
|--------|-------------|
| User | id, email (unique), pseudo (unique), passwordHash, role (USER/ADMIN), avatar?, bio? |
| Recipe | id, name, difficulty (EASY/MEDIUM/HARD), prepTime, servings?, status (PUBLISHED/PENDING/DRAFT), categoryId, authorId?, searchVector |
| Category | id, name (unique) |
| Ingredient | id, name (unique) |
| RecipeIngredient | quantity, unit, recipeId, ingredientId |
| Step | id, order, description, imageUrl?, recipeId |
| Favorite | PK composite (userId, recipeId) |
| Rating | score 1–5, unique(userId, recipeId) |
| Comment | content, unique(userId, recipeId) |
| Follow | followerId, followingId, unique pair |
| Notification | type (NotificationType), data (JSON), read |

**Note Prisma 7** : URL de connexion dans `prisma.config.ts`, pas dans `schema.prisma`. PrismaClient requiert `@prisma/adapter-pg`.

## Routes API complètes

```
GET    /health
POST   /upload                         image → /uploads/filename

POST   /auth/register                  { email, pseudo, password }
POST   /auth/login                     { email, password }
GET    /auth/me                        [auth]

GET    /recipes                        [optionalAuth] ?page&limit&search&category&status (cached)
GET    /recipes/search                 (cached)
GET    /recipes/:id                    [optionalAuth] (cached)
POST   /recipes                        [auth] → PENDING si USER, PUBLISHED si ADMIN
PUT    /recipes/:id                    [auth] auteur ou admin
DELETE /recipes/:id                    [auth] auteur ou admin
PATCH  /recipes/:id/publish            [admin]
PATCH  /recipes/:id/unpublish          [auth]

GET    /categories                     (cached 300s)

POST   /favorites/:recipeId            [auth] toggle (ajoute ou retire)
GET    /favorites                      [auth]

POST   /ratings/:recipeId              [auth] { score 1-5 } upsert
GET    /ratings/:recipeId/me           [auth]

GET    /comments/:recipeId             [optionalAuth]
POST   /comments/:recipeId             [auth] { content }
PUT    /comments/:id                   [auth] auteur
DELETE /comments/:id                   [auth] auteur ou admin

GET    /users/:id                      [optionalAuth]
GET    /users/:id/recipes
GET    /users/:id/followers            [optionalAuth]
GET    /users/:id/following            [optionalAuth]
POST   /users/:id/follow               [auth]
DELETE /users/:id/follow               [auth]

GET    /feed                           [auth]

GET    /notifications                  [auth]
PUT    /notifications/read-all         [auth]
PUT    /notifications/:id/read         [auth]
```

## Conventions de code

- **Langage** : JavaScript partout sauf `prisma.config.ts` (imposé par Prisma 7)
- **Style** : async/await, pas de callbacks
- **Nommage** : camelCase pour variables/fonctions, kebab-case pour fichiers
- **Commentaires** : en français
- **Structure routes** : chaque fichier de route délègue au controller correspondant
- **Gestion d'erreurs** : try/catch dans chaque controller, `next(err)` vers le handler global
- **Auth** : middleware `requireAuth` / `requireAdmin` / `optionalAuth` appliqué au niveau route
- **Cache** : middleware `cache(ttl)` depuis `cache.js` appliqué sur les GET publics

## Phases de développement

### P3 — En cours
- [x] Cache Redis (ioredis + middleware `cache.js`)
- [x] Rate limiting (express-rate-limit)
- [x] Tests Jest (setup, helpers, auth, recipes, follow, search)
- [ ] Couverture tests à compléter

### P4 — Planifiée
- Vision API pour identifier cocktails depuis une photo
- Génération IA de recettes
- Annuaire de bars

## Commandes utiles

```bash
# Développement
./dev.sh                          # Lance backend + frontend en parallèle
cd backend && npm run dev         # Backend seul (nodemon, port 3000)
cd frontend && npm run dev        # Frontend seul (vite, port 5173)

# Base de données
cd backend && npm run prisma:migrate   # Applique les migrations
cd backend && npm run prisma:generate  # Régénère le client Prisma
cd backend && npm run prisma:seed      # Seed de base (10 cocktails)
cd backend && npm run seed:big         # Gros dataset
cd backend && npm run seed:realistic   # Données réalistes

# Tests
cd backend && npm test            # Lance tous les tests Jest
cd backend && npm run test:watch  # Mode watch

# Admin
psql -h localhost -U cocktail_user -d cocktails_db
# Promouvoir en admin :
# UPDATE "User" SET role = 'ADMIN' WHERE pseudo = 'xxx';
```

## Points d'attention

- `GET /recipes` ne renvoie que `PUBLISHED` aux non-admins (filtre automatique dans le controller)
- `deleteRecipe` supprime en cascade : comments → ratings → favorites → ingredients → steps → recipe
- Images stockées dans `backend/uploads/`, exclues du git
- Proxy Vite : `/api/*` → `http://192.168.1.85:3000` (retire le préfixe `/api`)
- Warning `pg DeprecationWarning` sur `client.query()` : vient de `@prisma/adapter-pg`, pas actionnable
- Compte admin : felix.hennequin1@gmail.com / pseudo "felix"
