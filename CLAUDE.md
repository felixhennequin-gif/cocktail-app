# Écume — Contexte Claude Code

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 19 + Vite 7 + React Router 7 + Tailwind v4 |
| Backend | Node.js + Express 5 |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| BDD | PostgreSQL (`cocktails_db`) |
| Cache | Redis via `ioredis` |
| Auth | JWT (`jsonwebtoken` + `bcrypt`) + refresh token rotation + email verification |
| Email | `nodemailer` (vérification email, reset password, newsletter) |
| Tests | Jest + Supertest |
| Validation | Zod (`backend/src/schemas.js`) |
| Rate limiting | `express-rate-limit` (auth strict, general souple, API v1 tiered) |
| i18n | react-i18next (fr/en) |
| Push | `web-push` (Web Push API) |
| Export | `pdfkit` (PDF), `sharp` (images/OG cards) |

Serveur Debian local : `192.168.1.85`
- API backend : `http://192.168.1.85:3000`
- Frontend dev : `http://192.168.1.85:5173`
- Production : `https://cocktail-app.fr` (Nginx + SSL Let's Encrypt)

## Architecture des dossiers

```
cocktail-app/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Schéma BDD (33 modèles, 6 enums)
│   │   ├── seed.js              # 10 cocktails + tags de base
│   │   ├── seed-big.js          # Gros dataset
│   │   ├── seed-realistic.js    # Données réalistes
│   │   ├── seed-badges.js       # Badges et achievements
│   │   ├── seed-techniques.js   # Techniques de bar
│   │   ├── seed-catalog.js      # Catalogue complet
│   │   ├── seed-substitutions.js # Substitutions d'ingrédients
│   │   ├── seed-glossary.js     # Entrées du glossaire
│   │   ├── cleanup-tags.js      # Nettoyage tags dupliqués
│   │   └── migrations/          # Migrations Prisma auto-générées (25 migrations)
│   ├── scripts/
│   │   └── import-cocktaildb.js # Import depuis TheCocktailDB API
│   ├── tests/                   # Tests Jest + Supertest (23 fichiers)
│   └── src/
│       ├── index.js             # Entrée Express — monte toutes les routes
│       ├── prisma.js            # Singleton PrismaClient (adapter pg)
│       ├── cache.js             # Middleware cache Redis (dégradation gracieuse)
│       ├── rateLimiter.js       # Rate limiting (auth, général, API v1)
│       ├── schemas.js           # Schémas Zod pour validation
│       ├── logger.js            # Logging structuré
│       ├── config/
│       │   └── plans.js         # Configuration des limites par plan (FREE/PREMIUM)
│       ├── middleware/
│       │   ├── auth.js          # requireAuth, requireAdmin, optionalAuth
│       │   ├── api-key.js       # Validation clé API publique v1
│       │   ├── premium.js       # Vérification plan premium
│       │   ├── plan-limits.js   # Limites par plan (collections, etc.)
│       │   └── prerender.js     # SSR meta tags (OG, Twitter, Schema.org)
│       ├── routes/              # 31 fichiers — un par domaine
│       ├── controllers/         # 34 fichiers — logique métier par domaine
│       ├── services/
│       │   ├── notification-service.js
│       │   ├── recipe-cache-service.js
│       │   ├── recipe-search-service.js
│       │   ├── badge-service.js
│       │   ├── push-service.js
│       │   ├── ingredient-resolver.js
│       │   ├── email-service.js      # Envoi emails (vérification, reset, newsletter)
│       │   ├── email-templates.js    # Templates HTML pour emails
│       │   └── streak-service.js     # Calcul et mise à jour des streaks
│       └── helpers/
│           ├── recipe-helpers.js
│           ├── errors.js        # Erreurs standardisées
│           ├── parse-id.js
│           └── index.js
├── frontend/
│   └── src/
│       ├── i18n/                    # Configuration i18n + locales fr.json / en.json
│       ├── contexts/
│       │   ├── AuthContext.jsx      # JWT, login/register/logout, authFetch
│       │   ├── FavoritesContext.jsx  # État des favoris
│       │   └── ToastContext.jsx     # Notifications toast
│       ├── hooks/
│       │   ├── useFavorites.js
│       │   ├── usePushNotifications.js
│       │   ├── useOfflineCache.js
│       │   ├── useRecipeFilters.js
│       │   ├── useRecipeList.js
│       │   ├── useCompare.js        # Comparaison de cocktails (panier max 2)
│       │   └── useShoppingCart.js   # Panier liste de courses
│       ├── utils/
│       │   └── image.js             # Utilitaires image
│       ├── components/              # 23 composants racine + 7 sous-composants recipe/
│       │   ├── RecipeCard.jsx, RecipeCardGrid.jsx  # Cards recettes (memoized)
│       │   ├── SearchBar.jsx        # Recherche avec navigation clavier + ARIA
│       │   ├── FilterPanel.jsx      # Filtres avancés recettes
│       │   ├── VoiceSearch.jsx      # Recherche vocale
│       │   ├── Footer.jsx, Logo.jsx
│       │   ├── FollowButton.jsx, NotificationBell.jsx
│       │   ├── AddToCollectionModal.jsx, ConfirmModal.jsx
│       │   ├── ThemeToggle.jsx, LanguageToggle.jsx
│       │   ├── DifficultyBadge.jsx, Stars.jsx
│       │   ├── Skeleton.jsx, ErrorBoundary.jsx
│       │   ├── OfflineBanner.jsx    # Indicateur hors-ligne PWA
│       │   ├── PartyTimer.jsx
│       │   ├── CompareBar.jsx       # Barre flottante de comparaison
│       │   ├── TastingModal.jsx     # Modale "j'ai fait ce cocktail"
│       │   ├── ShoppingCartBar.jsx  # Barre flottante liste de courses
│       │   ├── ChangePasswordForm.jsx
│       │   └── recipe/              # Sous-composants fiche recette
│       │       ├── CommentSection.jsx, RatingStars.jsx
│       │       ├── RecipeIngredients.jsx, RecipeMeta.jsx
│       │       ├── PortionSelector.jsx, StepTimer.jsx
│       └── pages/                   # 35 pages + admin/
│           ├── LandingPage.jsx      # "/" — hero + cocktail du jour + populaires + CTA
│           ├── RecipeList.jsx       # "/recipes" — catalogue filtres, tri, tags, pagination
│           ├── RecipeDetail.jsx     # Fiche + notes + commentaires + collections + variantes
│           ├── RecipeSubmit.jsx     # Soumission recette (tags, variantes)
│           ├── CollectionDetail.jsx # Détail collection utilisateur
│           ├── UserProfile.jsx      # Profil + collections + stats + badges
│           ├── Feed.jsx             # Fil d'actualité (recettes des users suivis)
│           ├── Favorites.jsx        # Recettes favorites
│           ├── MyBar.jsx            # Bar virtuel + recettes réalisables
│           ├── TasteProfile.jsx     # Préférences goût (sucré/amer/acide/fort)
│           ├── CocktailQuiz.jsx     # Quiz interactif profil de goût
│           ├── PartyMode.jsx        # Mode soirée
│           ├── ChallengeDetail.jsx  # Défis communautaires
│           ├── BlogList.jsx         # Liste articles blog
│           ├── BlogArticle.jsx      # Article blog (markdown)
│           ├── TechniquesPage.jsx   # Techniques de bar avec vidéos
│           ├── PremiumPage.jsx      # Page premium / upsell
│           ├── ApiDocs.jsx          # Documentation API publique interactive
│           ├── LegalPage.jsx        # Mentions légales / CGU
│           ├── Login.jsx, Register.jsx
│           ├── VerifyEmail.jsx      # Vérification email par lien
│           ├── ForgotPassword.jsx   # Demande de réinitialisation mot de passe
│           ├── ResetPassword.jsx    # Réinitialisation mot de passe
│           ├── CocktailRoulette.jsx # Roulette aléatoire avec filtres
│           ├── CompareCocktails.jsx # Comparaison côte à côte
│           ├── MyTastings.jsx       # Journal de dégustation personnel
│           ├── ShoppingList.jsx     # Liste de courses multi-recettes
│           ├── CategoryPage.jsx     # Landing page SEO par catégorie
│           ├── TagPage.jsx          # Landing page SEO par tag
│           ├── AdventCalendar.jsx   # Calendrier de l'avent cocktails
│           ├── Leaderboard.jsx      # Classement communautaire
│           ├── MenuBuilder.jsx      # Générateur de menu cocktail imprimable
│           ├── Glossary.jsx         # Glossaire / encyclopédie
│           ├── GlossaryEntry.jsx    # Entrée du glossaire
│           ├── NotFound.jsx         # Page 404
│           └── admin/               # AdminRecipeList, AdminRecipeForm, AdminPendingList
├── scripts/
│   ├── deploy.sh                # Script déploiement auto (pm2)
│   └── webhook-server.js        # Webhook GitHub → déploiement continu
├── .github/workflows/ci.yml    # CI : tests backend (PostgreSQL 16 + Redis 7, Node 22)
├── docs/
│   ├── architecture.md          # Schéma des couches
│   └── decisions/               # ADRs
├── ecosystem.config.js          # Configuration pm2
└── dev.sh                       # Lance backend + frontend en concurrent
```

## Modèles Prisma (schema.prisma)

### Modèles principaux

| Modèle | Champs clés |
|--------|-------------|
| User | id, email (unique), pseudo (unique), passwordHash, role (USER/ADMIN), plan (FREE/PREMIUM), avatar?, bio? |
| Recipe | id, name, difficulty, prepTime, servings?, status (PUBLISHED/PENDING/DRAFT), categoryId, authorId?, parentRecipeId?, season?, isSponsored, sponsorName?, sponsorLogo?, searchVector |
| Category | id, name (unique) |
| Ingredient | id, name (unique), affiliateUrl? |
| RecipeIngredient | quantity, unit, recipeId, ingredientId |
| Step | id, order, description, imageUrl?, recipeId |
| Tag | id, name (unique, normalisé lowercase) |
| RecipeTag | recipeId, tagId — PK composite |
| Collection | id, name, description?, isPublic, userId |
| CollectionRecipe | collectionId, recipeId, addedAt — PK composite |
| Favorite | PK composite (userId, recipeId) |
| Rating | score 1–5, unique(userId, recipeId) |
| Comment | content, userId, recipeId |
| Follow | followerId, followingId, unique pair |
| Notification | type (NotificationType), data (JSON), read |

### Modèles ajoutés (P5+)

| Modèle | Champs clés |
|--------|-------------|
| UserIngredient | userId, ingredientId — PK composite (bar virtuel) |
| RefreshToken | id, token, family, consumed, expiresAt (rotation JWT) |
| PushSubscription | endpoint, p256dh, auth (Web Push) |
| UserPreference | sweetness, bitterness, sourness, strength (1-5), excludedIngredients (profil goût) |
| Badge | id, code, name, description, icon, condition, threshold |
| UserBadge | userId, badgeId — PK composite, unlockedAt |
| Challenge | id, title, description, startDate, endDate, tagId, active |
| ChallengeEntry | challengeId, recipeId, userId — PK composite |
| Technique | id, name, slug, description, videoUrl?, iconUrl? |
| ApiKey | id, key, name, userId, lastUsedAt (API publique) |
| Article | id, title, slug, content (markdown), excerpt, coverImage, authorId, status (DRAFT/PUBLISHED), publishedAt |
| ArticleTag | articleId, tagId — PK composite |

### Modèles ajoutés (P6)

| Modèle | Champs clés |
|--------|-------------|
| TastingLog | id, userId, recipeId, notes?, photoUrl?, personalRating? (1-5), adjustments?, madeAt (journal de dégustation) |
| IngredientSubstitution | id, ingredientId, substituteId, ratio (Float), notes? (suggestions de substitution) |
| UserStreak | id, userId (unique), currentStreak, longestStreak, lastActiveDate?, streakFreezeAvailable (streaks d'activité) |
| RecipeRevision | id, recipeId, version, data (Json snapshot), authorId, message? (historique des versions) |
| NewsletterSubscription | id, userId (unique), email, active, unsubscribeToken (newsletter hebdomadaire) |
| GlossaryEntry | id, term (unique), slug (unique), definition, longDescription?, category, relatedRecipeIds, relatedEntryIds (glossaire) |

### Enums
`Role` (USER/ADMIN), `Plan` (FREE/PREMIUM), `RecipeStatus` (PUBLISHED/PENDING/DRAFT), `Difficulty` (EASY/MEDIUM/HARD), `NotificationType` (NEW_RECIPE/COMMENT_ON_RECIPE/RECIPE_APPROVED/NEW_FOLLOWER/NEW_BADGE), `ArticleStatus` (PUBLISHED/DRAFT)

**Note Prisma 7** : URL de connexion dans `prisma.config.ts`, pas dans `schema.prisma`. PrismaClient requiert `@prisma/adapter-pg`.

## Routes API complètes

Toutes les routes data sont montées sous `/api` (proxy Vite retire le préfixe `/api`).

```
GET    /health
POST   /upload                         [auth] image → /uploads/filename
POST   /upload/step/:recipeId          [auth] image étape → /uploads/recipes/{id}/steps/
GET    /sitemap.xml                    Sitemap XML dynamique

# Auth
POST   /auth/register                  { email, pseudo, password }
POST   /auth/login                     { email, password }
POST   /auth/logout                    [auth] invalidation refresh token
POST   /auth/refresh                   { refreshToken } → rotation token family
GET    /auth/me                        [auth]
GET    /auth/verify-email              ?token= vérification email
POST   /auth/resend-verification       [auth] renvoyer email de vérification
POST   /auth/forgot-password           { email } → envoie email reset
POST   /auth/reset-password            { token, password }
PUT    /auth/change-password           [auth] { currentPassword, newPassword }

# Recettes
GET    /recipes                        [optionalAuth] ?page&limit&search&category&status&tags (cached)
GET    /recipes/daily                  [optionalAuth] cocktail du jour (cache manuelle)
GET    /recipes/seasonal               [optionalAuth] recettes de saison (cached 1h)
GET    /recipes/recommended            [auth] recommandations basées sur le profil goût
GET    /recipes/advent                 calendrier de l'avent — résumé (cached 1h)
GET    /recipes/advent/:day            calendrier de l'avent — recette du jour (cached 1h)
GET    /recipes/:id                    [optionalAuth] (cached) — inclut tags, variantes, parentRecipe
GET    /recipes/:id/history            historique des versions de la recette
GET    /recipes/:id/revisions/:version version spécifique d'une recette
POST   /recipes                        [auth] → PENDING si USER, PUBLISHED si ADMIN
PUT    /recipes/:id                    [auth] auteur ou admin
DELETE /recipes/:id                    [auth] auteur ou admin (cascade complète)
PATCH  /recipes/:id/publish            [admin]
PATCH  /recipes/:id/unpublish          [auth]
GET    /recipes/:id/pdf                Export PDF de la recette
GET    /recipes/:id/og-image           Génération image OG dynamique

# Tags, Catégories, Ingrédients
GET    /tags                           (cached 120s) — triés par popularité
GET    /categories                     (cached 300s)
GET    /ingredients                    (cached 120s) Liste des ingrédients
GET    /ingredients/:id/substitutes    [optionalAuth] (cached 300s) substitutions possibles
PATCH  /ingredients/:id               [admin] modifier un ingrédient

# Collections
GET    /collections/curated            collections curées par des experts (cached 1h)
GET    /collections/curated/:id        [optionalAuth] détail collection curée (cached 300s)
GET    /collections/me                 [auth] mes collections (preview 4 recettes)
GET    /collections/:id                [optionalAuth] collection publique ou propre
POST   /collections                    [auth] { name, description?, isPublic? } — max 20/user
PUT    /collections/:id                [auth] propriétaire
DELETE /collections/:id                [auth] propriétaire
POST   /collections/:id/recipes        [auth] { recipeId } — max 100/collection
DELETE /collections/:id/recipes/:recipeId  [auth]

# Favoris, Notes, Commentaires
POST   /favorites/:recipeId            [auth] toggle
GET    /favorites                      [auth]
POST   /ratings/:recipeId              [auth] { score 1-5 } upsert
GET    /ratings/:recipeId/me           [auth]
GET    /comments/:recipeId             [optionalAuth]
POST   /comments/:recipeId             [auth] { content }
PUT    /comments/:id                   [auth] auteur
DELETE /comments/:id                   [auth] auteur ou admin

# Users & Social
GET    /users/:id                      [optionalAuth]
GET    /users/:id/recipes
GET    /users/:id/stats                [optionalAuth] statistiques profil (cached 60s)
GET    /users/:id/followers            [optionalAuth]
GET    /users/:id/following            [optionalAuth]
POST   /users/:id/follow               [auth]
DELETE /users/:id/follow               [auth]
PUT    /users/me                       [auth] mise à jour profil
GET    /users/me/preferences           [auth] préférences goût
PUT    /users/me/preferences           [auth] upsert préférences
PATCH  /users/admin/:id/plan           [admin] changer plan user

# Feed & Notifications
GET    /feed                           [auth]
GET    /notifications                  [auth]
PUT    /notifications/read-all         [auth]
PUT    /notifications/:id/read         [auth]

# Bar virtuel
GET    /bar                            [auth] recettes réalisables avec mon bar
GET    /bar/ingredients                [auth] ingrédients de mon bar
PUT    /bar                            [auth] mise à jour bar virtuel
GET    /bar/makeable                   [auth] recettes faisables

# Badges & Défis
GET    /badges                         liste tous les badges
GET    /badges/me                      [auth] mes badges
GET    /badges/user/:userId            badges d'un user
GET    /challenges                     liste des défis
GET    /challenges/current             défi en cours
GET    /challenges/:id                 détail défi
POST   /challenges/:id/enter           [auth] participer au défi
POST   /challenges                     [admin] créer un défi

# Blog
GET    /articles                       liste articles publiés
GET    /articles/:slug                 article par slug
POST   /articles                       [admin] créer article
PUT    /articles/:slug                 [admin] modifier article
DELETE /articles/:slug                 [admin] supprimer article

# Techniques de bar
GET    /techniques                     liste techniques
GET    /techniques/:slug               technique par slug
POST   /techniques                     [admin] créer technique
PUT    /techniques/:slug               [admin] modifier technique

# Push Notifications
GET    /push/vapid-key                 clé publique VAPID
POST   /push/subscribe                 [auth] s'abonner push
DELETE /push/subscribe                 [auth] se désabonner

# Journal de dégustation
POST   /tastings                       [auth] { recipeId, notes?, photoUrl?, personalRating?, adjustments? }
GET    /tastings                       [auth] mes dégustations (paginé, cached 30s)
GET    /tastings/stats                 [auth] statistiques dégustations (cached 60s)
DELETE /tastings/:id                   [auth]

# Liste de courses
POST   /shopping-list                  [auth] { recipeIds, servingsMultiplier? } → liste consolidée

# Leaderboard
GET    /leaderboard                    [optionalAuth] classement communautaire (cached 1h)

# Streaks
GET    /streak                         [auth] streak d'activité de l'utilisateur

# Menu imprimable
POST   /menus/generate                 [auth] générer un menu cocktail

# Glossaire
GET    /glossary                       (cached 1h) liste des entrées
GET    /glossary/:slug                 (cached 1h) entrée du glossaire
POST   /glossary                       [admin] créer une entrée

# Newsletter
GET    /newsletter/status              [auth] statut d'abonnement
POST   /newsletter/subscribe           [auth] s'abonner
DELETE /newsletter/subscribe           [auth] se désabonner
GET    /newsletter/unsubscribe/:token  désabonnement par lien email

# Widget embeddable (hors /api — HTML direct)
GET    /embed/recipes/:id              widget recette embeddable (cached 1h)

# API publique v1 (rate limited, clé API optionnelle)
GET    /api/v1/recipes                 100/min anon, 500/min avec clé
GET    /api/v1/recipes/:id
GET    /api/v1/categories
GET    /api/v1/tags
GET    /api/v1/ingredients

# Clés API
GET    /api-keys                       [auth] mes clés
POST   /api-keys                       [auth] créer clé
DELETE /api-keys/:id                   [auth] supprimer clé

# Documentation API
GET    /api-docs                       page documentation interactive
```

## Conventions de code

- **Langage** : JavaScript partout sauf `prisma.config.ts` (imposé par Prisma 7)
- **Style** : async/await, pas de callbacks
- **Nommage** : camelCase pour variables/fonctions, kebab-case pour fichiers
- **Commentaires** : en français
- **Structure routes** : chaque fichier de route délègue au controller correspondant
- **Gestion d'erreurs** : try/catch dans chaque controller, `next(err)` vers le handler global. Erreurs standardisées dans `helpers/errors.js`
- **Validation** : schémas Zod centralisés dans `schemas.js`, appliqués dans les controllers
- **Auth** : middleware `requireAuth` / `requireAdmin` / `optionalAuth` appliqué au niveau route
- **Cache** : middleware `cache(ttl)` depuis `cache.js` appliqué sur les GET publics
- **i18n** : toutes les chaînes UI dans `frontend/src/i18n/locales/{fr,en}.json`, utiliser `useTranslation()`
- **Composants React** : memoized avec `React.memo` pour les composants fréquents (RecipeCard, RecipeCardGrid)
- **State management** : React Context (Auth, Favorites, Toast) + custom hooks

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
- [x] Rate limiting (express-rate-limit) — tiers: auth strict, général, API v1
- [x] Tests Jest (auth, recipes, follow, search, cascade-delete, etc.)
- [x] CI GitHub Actions (PostgreSQL 16 + Redis 7, Node 22, tests + Prisma migrate)
- [x] Déploiement continu (webhook GitHub → deploy.sh → pm2)
- [x] Validation Zod centralisée (schemas.js)
- [x] Logging structuré (logger.js)
- [x] Erreurs standardisées (helpers/errors.js)
- [ ] Couverture tests à compléter

### P3bis — UX & Frontend
- [x] Dark mode avec persistence localStorage
- [x] i18n français/anglais (react-i18next)
- [x] PWA (manifest, service worker, offline fallback, OfflineBanner)
- [x] Infinite scroll (IntersectionObserver)
- [x] Skeleton loaders, toasts, modales de confirmation
- [x] Responsive mobile, SEO meta tags
- [x] ErrorBoundary React
- [x] Recherche vocale (VoiceSearch)
- [x] Filtres avancés (FilterPanel)

### P4 — Contenu & Social
- [x] Système de tags / occasions (many-to-many, normalisation lowercase)
- [x] Collections de recettes utilisateur (max 20 collections, 100 recettes/collection)
- [x] Cocktail du jour (déterministe SHA-256 hash de la date, cache Redis)
- [x] Variantes de recettes (self-relation parentRecipeId, 1 niveau max)

### P5 — Fonctionnalités avancées
- [x] Bar virtuel (UserIngredient) + recettes réalisables
- [x] Système de badges et achievements
- [x] Défis communautaires (challenges)
- [x] Mode soirée (PartyMode + PartyTimer)
- [x] Profil de goût (UserPreference) + quiz interactif
- [x] Recommandations basées sur le profil
- [x] Recettes saisonnières
- [x] Push notifications (Web Push API, VAPID)
- [x] API publique v1 + clés API + documentation interactive
- [x] Plan premium (FREE/PREMIUM)
- [x] Blog (articles markdown, ArticleStatus)
- [x] Techniques de bar (vidéos, tutoriels)
- [x] Export PDF + images OG dynamiques
- [x] Sitemap XML dynamique + Schema.org markup
- [x] Prerender SSR pour bots (meta OG, Twitter)
- [x] Liens affiliés (Ingredient.affiliateUrl)
- [x] Recettes sponsorisées (isSponsored, sponsorName, sponsorLogo)
- [x] Import TheCocktailDB
- [x] Refresh token rotation (famille + détection réutilisation)
- [x] Timers par étape (StepTimer)
- [x] Sélecteur de portions (PortionSelector)
- [x] Statistiques profil utilisateur

### P6 — Engagement & Contenu avancé
- [x] Vérification email + reset password + changement mot de passe
- [x] Journal de dégustation personnel (TastingLog, MyTastings)
- [x] Roulette à cocktails avec filtres (CocktailRoulette)
- [x] Liste de courses multi-recettes consolidée (ShoppingList)
- [x] Suggestions de substitution d'ingrédients (IngredientSubstitution)
- [x] Calendrier de l'avent cocktails (AdventCalendar)
- [x] Système de streaks d'activité (UserStreak)
- [x] Comparaison de cocktails côte à côte (CompareCocktails)
- [x] Leaderboard communautaire
- [x] Landing pages SEO par catégorie et tag (CategoryPage, TagPage)
- [x] Estimation du coût d'une recette
- [x] Menu cocktail imprimable pour événements (MenuBuilder)
- [x] Widget recette embeddable (/embed/recipes/:id)
- [x] Glossaire et encyclopédie du cocktail (GlossaryEntry)
- [x] Historique et versioning des recettes (RecipeRevision)
- [x] Collections curées par des experts
- [x] Newsletter hebdomadaire automatique (NewsletterSubscription)
- [ ] Couverture tests à compléter

### P7 — Planifié
- [ ] Vision API pour identifier cocktails depuis une photo
- [ ] Génération IA de recettes (Claude API)
- [ ] Scan de bouteille pour ajout au bar virtuel
- [ ] Annuaire de bars
- [ ] Notifications temps réel via WebSocket
- [ ] Mode déconnecté intelligent (PWA avancé)
- [ ] Application mobile React Native

## Commandes utiles

```bash
# Développement
./dev.sh                          # Lance backend + frontend en parallèle
cd backend && npm run dev         # Backend seul (nodemon, port 3000)
cd frontend && npm run dev        # Frontend seul (vite, port 5173)

# Base de données
cd backend && npm run prisma:migrate   # Applique les migrations
cd backend && npm run prisma:generate  # Régénère le client Prisma
cd backend && npm run prisma:seed      # Seed de base (10 cocktails + tags)
cd backend && npm run seed:big         # Gros dataset
cd backend && npm run seed:realistic   # Données réalistes
cd backend && npm run seed:badges      # Seed badges/achievements
cd backend && npm run seed:techniques  # Seed techniques de bar
cd backend && npm run tags:cleanup     # Nettoyage tags dupliqués

# Tests
cd backend && npm test            # Lance tous les tests Jest (--runInBand --forceExit)
cd backend && npm run test:watch  # Mode watch

# Import
cd backend && npm run import:cocktaildb  # Import depuis TheCocktailDB

# Lint
cd backend && npm run lint        # ESLint backend
cd frontend && npm run lint       # ESLint frontend

# Déploiement
scripts/deploy.sh                 # Déploiement manuel (fetch main, npm ci, migrate, build, pm2 restart)

# Admin
psql -h localhost -U cocktail_user -d cocktails_db
# Promouvoir en admin :
# UPDATE "User" SET role = 'ADMIN' WHERE pseudo = 'xxx';
```

## Points d'attention

- **Routing frontend** : `/` → `LandingPage` (hero + découverte), `/recipes` → `RecipeList` (catalogue complet avec filtres). La search bar du header redirige vers `/recipes?q=xxx` depuis la landing, filtre en temps réel sur le catalogue.
- **Montage des routes** : toutes les routes data sous `/api` via `apiRouter`, sauf `/embed/*` (HTML direct), `/api/v1/*`, `/api-docs`, `/sitemap.xml`
- `GET /recipes` ne renvoie que `PUBLISHED` aux non-admins (filtre automatique dans le controller)
- `deleteRecipe` supprime en cascade : collectionRecipes → recipeTag → comments → ratings → favorites → ingredients → steps → détache variantes → recipe
- Images stockées dans `backend/uploads/`, images d'étapes dans `uploads/recipes/{id}/steps/`, exclues du git
- Upload : validation MIME type + magic bytes (JPEG/PNG/WebP/GIF uniquement, pas de SVG — vecteur XSS)
- Proxy Vite : `/api/*` → `http://192.168.1.85:3000` (retire le préfixe `/api`)
- Warning `pg DeprecationWarning` sur `client.query()` : vient de `@prisma/adapter-pg`, pas actionnable
- Compte admin : felix.hennequin1@gmail.com / pseudo "felix"
- Tags normalisés : `name.trim().toLowerCase()` à la création/résolution
- Cocktail du jour : déterministe via `SHA-256(YYYY-MM-DD)` modulo nombre de recettes publiées, cache Redis jusqu'à minuit
- Variantes : max 1 niveau (pas de variante de variante), `parentRecipeId` nullable
- Collections : max 20/user, max 100 recettes/collection, isPublic par défaut true
- Refresh tokens : rotation par famille, détection de réutilisation invalide toute la famille. Nettoyage périodique (24h) des tokens expirés via `setInterval`
- Rate limiting API v1 : 100/min anonyme, 500/min avec clé API
- Rate limiting auth : limiters dédiés sur login, register, refresh, forgot-password, resend-verification, change-password
- Prerender : détection bot via User-Agent, injecte meta OG/Twitter/Schema.org
- Arrêt gracieux du serveur : SIGTERM/SIGINT → fermeture HTTP, déconnexion Prisma + Redis, timeout 10s
- Config plans : limites par plan définies dans `backend/src/config/plans.js`, middleware `plan-limits.js`
