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
| i18n | react-i18next (fr/en) |

Serveur Debian local : `192.168.1.85`
- API backend : `http://192.168.1.85:3000`
- Frontend dev : `http://192.168.1.85:5173`
- Production : `https://cocktail-app.fr` (Nginx + SSL Let's Encrypt)

## Architecture des dossiers

```
cocktail-app/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Schéma BDD complet
│   │   ├── seed.js              # 10 cocktails + 9 tags de base
│   │   ├── seed-big.js          # Gros dataset
│   │   ├── seed-realistic.js    # Données réalistes
│   │   └── migrations/          # Migrations Prisma auto-générées
│   ├── tests/                   # Tests Jest + Supertest
│   └── src/
│       ├── index.js             # Entrée Express — monte toutes les routes
│       ├── prisma.js            # Singleton PrismaClient (adapter pg)
│       ├── cache.js             # Middleware cache Redis (dégradation gracieuse)
│       ├── rateLimiter.js       # Rate limiting (auth strict, général souple)
│       ├── middleware/
│       │   └── auth.js          # requireAuth, requireAdmin, optionalAuth
│       ├── routes/              # Un fichier par domaine
│       ├── controllers/         # Logique métier, un fichier par domaine
│       └── services/
│           └── notification-service.js
├── frontend/
│   └── src/
│       ├── i18n/                    # Configuration i18n + locales fr.json / en.json
│       ├── contexts/                # AuthContext (JWT), ToastContext
│       ├── components/              # RecipeCard, SearchBar, FollowButton, NotificationBell, AddToCollectionModal, etc.
│       └── pages/                   # 12 pages + admin/
│           ├── RecipeList.jsx       # Catalogue + tags + cocktail du jour + infinite scroll
│           ├── RecipeDetail.jsx     # Fiche + notes + commentaires + collections + variantes
│           ├── RecipeSubmit.jsx     # Soumission recette (tags, variantes)
│           ├── CollectionDetail.jsx # Détail collection utilisateur
│           ├── UserProfile.jsx      # Profil + onglet collections
│           └── admin/               # AdminRecipeList, AdminRecipeForm, AdminPendingList
├── scripts/
│   ├── deploy.sh                # Script déploiement auto (pm2)
│   └── webhook-server.js        # Webhook GitHub → déploiement continu
├── .github/workflows/ci.yml    # CI : tests backend sur push/PR
├── docs/
│   ├── architecture.md          # Schéma des couches
│   └── decisions/               # ADRs
└── dev.sh                       # Lance backend + frontend en concurrent
```

## Modèles Prisma (schema.prisma)

| Modèle | Champs clés |
|--------|-------------|
| User | id, email (unique), pseudo (unique), passwordHash, role (USER/ADMIN), avatar?, bio? |
| Recipe | id, name, difficulty (EASY/MEDIUM/HARD), prepTime, servings?, status (PUBLISHED/PENDING/DRAFT), categoryId, authorId?, parentRecipeId?, searchVector |
| Category | id, name (unique) |
| Ingredient | id, name (unique) |
| RecipeIngredient | quantity, unit, recipeId, ingredientId |
| Step | id, order, description, imageUrl?, recipeId |
| Tag | id, name (unique, normalisé lowercase) |
| RecipeTag | recipeId, tagId — PK composite |
| Collection | id, name, description?, isPublic, userId |
| CollectionRecipe | collectionId, recipeId, addedAt — PK composite |
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

GET    /recipes                        [optionalAuth] ?page&limit&search&category&status&tags (cached)
GET    /recipes/search                 (cached)
GET    /recipes/daily                  [optionalAuth] cocktail du jour déterministe (cached 300s)
GET    /recipes/:id                    [optionalAuth] (cached) — inclut tags, variantes, parentRecipe
POST   /recipes                        [auth] → PENDING si USER, PUBLISHED si ADMIN — supporte tagIds, tagNames, parentRecipeId
PUT    /recipes/:id                    [auth] auteur ou admin — supporte tagIds, tagNames
DELETE /recipes/:id                    [auth] auteur ou admin (cascade complète)
PATCH  /recipes/:id/publish            [admin]
PATCH  /recipes/:id/unpublish          [auth]

GET    /tags                           (cached 120s) — triés par popularité, inclut _count

GET    /categories                     (cached 300s)

GET    /collections                    [auth] mes collections (avec preview 4 recettes)
GET    /collections/:id                collection publique ou propre (avec recettes + avgRating)
POST   /collections                    [auth] { name, description?, isPublic? } — max 20/user
PUT    /collections/:id                [auth] propriétaire
DELETE /collections/:id                [auth] propriétaire
POST   /collections/:id/recipes        [auth] { recipeId } — max 100/collection
DELETE /collections/:id/recipes/:recipeId  [auth] propriétaire

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
- **i18n** : toutes les chaînes UI dans `frontend/src/i18n/locales/{fr,en}.json`, utiliser `useTranslation()`

## Fonctionnalités par phase

### P1-P2 — Base
- [x] CRUD recettes + catégories + ingrédients + étapes
- [x] Auth JWT (register/login/logout, rôles USER/ADMIN)
- [x] Favoris, notes 1-5 étoiles, commentaires
- [x] Profil utilisateur public
- [x] Soumission recette par users + modération admin
- [x] Follow/unfollow + feed + notifications

### P3 — Qualité & Performance
- [x] Cache Redis (ioredis + middleware `cache.js`, dégradation gracieuse)
- [x] Rate limiting (express-rate-limit)
- [x] Tests Jest (auth, recipes, follow, search, cascade-delete, etc.)
- [x] CI GitHub Actions (tests + Prisma migrate sur push/PR)
- [x] Déploiement continu (webhook GitHub → deploy.sh → pm2)
- [ ] Couverture tests à compléter

### P3bis — UX & Frontend
- [x] Dark mode avec persistence localStorage
- [x] i18n français/anglais (react-i18next)
- [x] PWA basique (manifest, service worker, offline fallback)
- [x] Infinite scroll (IntersectionObserver)
- [x] Skeleton loaders, toasts, modales de confirmation
- [x] Responsive mobile, SEO meta tags

### P4 — Contenu & Social
- [x] Système de tags / occasions (many-to-many, normalisation lowercase)
- [x] Collections de recettes utilisateur (max 20 collections, 100 recettes/collection)
- [x] Cocktail du jour (déterministe SHA-256 hash de la date, cache Redis)
- [x] Variantes de recettes (self-relation parentRecipeId, 1 niveau max)

### P5 — Planifié
- [ ] Vision API pour identifier cocktails depuis une photo
- [ ] Génération IA de recettes
- [ ] Annuaire de bars
- [ ] Dashboard statistiques profil
- [ ] Système de badges et achievements

## Commandes utiles

```bash
# Développement
./dev.sh                          # Lance backend + frontend en parallèle
cd backend && npm run dev         # Backend seul (nodemon, port 3000)
cd frontend && npm run dev        # Frontend seul (vite, port 5173)

# Base de données
cd backend && npm run prisma:migrate   # Applique les migrations
cd backend && npm run prisma:generate  # Régénère le client Prisma
cd backend && npm run prisma:seed      # Seed de base (10 cocktails + 9 tags)
cd backend && npm run seed:big         # Gros dataset
cd backend && npm run seed:realistic   # Données réalistes

# Tests
cd backend && npm test            # Lance tous les tests Jest
cd backend && npm run test:watch  # Mode watch

# Déploiement
scripts/deploy.sh                 # Déploiement manuel (fetch main, npm ci, migrate, build, pm2 restart)

# Admin
psql -h localhost -U cocktail_user -d cocktails_db
# Promouvoir en admin :
# UPDATE "User" SET role = 'ADMIN' WHERE pseudo = 'xxx';
```

## Points d'attention

- `GET /recipes` ne renvoie que `PUBLISHED` aux non-admins (filtre automatique dans le controller)
- `deleteRecipe` supprime en cascade : collectionRecipes → recipeTag → comments → ratings → favorites → ingredients → steps → détache variantes → recipe
- Images stockées dans `backend/uploads/`, exclues du git
- Proxy Vite : `/api/*` → `http://192.168.1.85:3000` (retire le préfixe `/api`)
- Warning `pg DeprecationWarning` sur `client.query()` : vient de `@prisma/adapter-pg`, pas actionnable
- Compte admin : felix.hennequin1@gmail.com / pseudo "felix"
- Tags normalisés : `name.trim().toLowerCase()` à la création/résolution
- Cocktail du jour : déterministe via `SHA-256(YYYY-MM-DD)` modulo nombre de recettes publiées, cache Redis jusqu'à minuit
- Variantes : max 1 niveau (pas de variante de variante), `parentRecipeId` nullable
- Collections : max 20/user, max 100 recettes/collection, isPublic par défaut true
