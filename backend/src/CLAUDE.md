# backend/src/ — Contexte couche API

## Structure

```
src/
├── index.js           # Entrée Express : middleware globaux, montage des routes, handler d'erreur
├── prisma.js          # Singleton PrismaClient avec @prisma/adapter-pg
├── cache.js           # Middleware cache Redis (ioredis)
├── rateLimiter.js     # Rate limiters (authLimiter + generalLimiter)
├── middleware/
│   └── auth.js        # requireAuth, requireAdmin, optionalAuth
├── routes/            # Un fichier par domaine — délèguent aux controllers
├── controllers/       # Logique métier — accès Prisma, calculs, réponses HTTP
└── services/
    └── notification-service.js  # Création de notifications (appelé par follow-controller)
```

## Conventions de ce dossier

### Routes
- Chaque fichier de route ne contient que le montage des handlers et les middlewares
- Format : `router.METHOD('/path', middleware1, middleware2, controller.action)`
- Le cache middleware (`cache(ttl)`) est appliqué sur les GET sans données user-spécifiques
- L'invalidation de cache après mutation est faite dans le controller (pas dans la route)

### Controllers
- Pattern try/catch systématique avec `next(err)` pour les erreurs non gérées
- Vérification d'autorisation en début de function (avant toute requête Prisma)
- `select` Prisma minimal — jamais renvoyer `passwordHash`
- Réponses : 200 (GET/PUT), 201 (POST création), 204 (DELETE), 400 (validation), 401 (auth), 403 (forbidden), 404 (not found), 409 (conflit unique)

### Erreurs Prisma à gérer explicitement
- `P2002` : contrainte unique violée → 409
- `P2025` : record inexistant → 404
- Autres : laisser remonter au handler global d'erreur dans `index.js`

### Middleware auth

```js
// requireAuth    : vérifie JWT, injecte req.user, renvoie 401 si absent/invalide
// requireAdmin   : idem + vérifie req.user.role === 'ADMIN', renvoie 403 sinon
// optionalAuth   : décode JWT si présent, injecte req.user, pas d'erreur si absent
```

### Cache Redis

```js
// Middleware appliqué sur une route :
router.get('/', cache(60), controller.getAll);

// Invalidation dans un controller après mutation :
await redis.del('cache:/recipes');
// Ou pattern wildcard via SCAN + DEL pour plusieurs clés
```

### Rate limiting

Deux limiters définis dans `rateLimiter.js` :
- `authLimiter` : routes `/auth/register` et `/auth/login` (limite les brute-force)
- `generalLimiter` : monté globalement dans `index.js`
