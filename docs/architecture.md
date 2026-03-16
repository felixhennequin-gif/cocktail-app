# Architecture — Cocktail App

## Schéma des couches

```
┌─────────────────────────────────────────────────────────┐
│                     NAVIGATEUR                          │
│              React 19 + Vite + Tailwind v4              │
│                                                         │
│  AuthContext (JWT localStorage)                         │
│  authFetch() → injecte Authorization header             │
│                                                         │
│  Pages : RecipeList, RecipeDetail, Feed, UserProfile    │
│           AdminRecipeList, AdminPendingList, ...        │
│  Components : RecipeCard, SearchBar, FollowButton,      │
│               NotificationBell                          │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP/JSON
                        │ /api/* → proxy Vite (dev)
                        │ http://192.168.1.85:3000 (prod)
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   EXPRESS 5 (port 3000)                 │
│                     backend/src/index.js                │
│                                                         │
│  Middleware globaux :                                   │
│  ├── CORS                                               │
│  ├── express.json()                                     │
│  ├── rateLimiter (express-rate-limit)                   │
│  │   ├── authLimiter : 10 req/15min sur /auth           │
│  │   └── generalLimiter : 100 req/15min                 │
│  └── express.static('uploads/')                         │
│                                                         │
│  Routes + Controllers :                                 │
│  ├── /auth      → auth-controller                       │
│  ├── /recipes   → recipe-controller  [cache Redis]      │
│  ├── /categories → category-controller [cache Redis]    │
│  ├── /favorites → favorite-controller                   │
│  ├── /ratings   → rating-controller                     │
│  ├── /comments  → comment-controller                    │
│  ├── /users     → user-controller + follow-controller   │
│  ├── /feed      → feed-controller (recettes followés)   │
│  └── /notifications → notification-controller           │
│                                                         │
│  Middleware auth : requireAuth / requireAdmin /          │
│                    optionalAuth (JWT verify)            │
└──────────┬───────────────────────┬──────────────────────┘
           │                       │
           ▼                       ▼
┌──────────────────┐    ┌─────────────────────────────────┐
│   REDIS          │    │   PRISMA 7 (ORM)                │
│   (ioredis)      │    │   @prisma/adapter-pg            │
│                  │    │                                  │
│  Cache GET :     │    │  Modèles : User, Recipe,        │
│  ├── /recipes    │    │  Category, Ingredient,           │
│  ├── /recipes/:id│    │  RecipeIngredient, Step,         │
│  └── /categories │    │  Favorite, Rating, Comment,      │
│                  │    │  Follow, Notification            │
│  TTL : 60–300s   │    │                                  │
│  Invalidation    │    │  Transactions ($transaction)     │
│  sur mutations   │    │  pour opérations multi-modèles   │
└──────────────────┘    └──────────────┬──────────────────┘
                                       │
                                       ▼
                        ┌─────────────────────────────────┐
                        │   POSTGRESQL                    │
                        │   cocktails_db                  │
                        │   user: cocktail_user           │
                        │   host: localhost               │
                        │                                  │
                        │  Index :                        │
                        │  ├── searchVector (tsvector)    │
                        │  │   full-text search           │
                        │  ├── Follow(followerId,         │
                        │  │        followingId)          │
                        │  └── Notification(userId,       │
                        │           createdAt)            │
                        └─────────────────────────────────┘
```

## Flux d'une requête typique

### GET /api/recipes (catalogue public)

```
Browser → Vite Proxy → Express
  → rateLimiter (check)
  → optionalAuth (décoder JWT si présent)
  → cache middleware (check Redis)
     ├── Cache HIT  → res.json(cached)
     └── Cache MISS → recipe-controller.getAll()
                        → prisma.recipe.findMany(
                            where: { status: 'PUBLISHED' },  // filtre auto si non-admin
                            include: { ratings, category, author }
                          )
                        → calcul avgRating
                        → cache.set(key, result, TTL)
                        → res.json(result)
```

### POST /api/recipes (création par un USER)

```
Browser → Express
  → rateLimiter
  → requireAuth (vérifie JWT, injecte req.user)
  → recipe-controller.create()
     → validation corps (Zod)
     → status = req.user.role === 'ADMIN' ? 'PUBLISHED' : 'PENDING'
     → prisma.$transaction([
         recipe.create(),
         step.createMany(),
         ingredientUpserts + recipeIngredient.createMany()
       ])
     → cache.invalidate('/recipes*')
     → res.status(201).json(recipe)
```

## Décisions d'architecture

Voir [docs/decisions/](./decisions/) pour les ADRs complets.

| Décision | Raison |
|----------|--------|
| Prisma 7 + adapter-pg | API moderne, types générés, migrations auto |
| Redis pour cache | Réduire la charge PG sur les GET publics fréquents |
| JWT stateless | Pas de session serveur, compatible multi-instance |
| Status PENDING/PUBLISHED/DRAFT | Modération sans bloquer les auteurs |
| Express 5 | Async error handling natif |
| Pas de TypeScript côté backend | MVP rapide, Prisma génère les types si besoin |
