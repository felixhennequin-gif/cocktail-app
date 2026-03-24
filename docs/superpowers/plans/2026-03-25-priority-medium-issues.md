# Priority:Medium Issues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Résoudre les 14 issues GitHub `priority:medium` ouvertes sur le dépôt cocktail-app.

**Architecture:** Corrections groupées par couche (frontend → backend code quality → schema DB → features → tests). Chaque groupe produit un ou plusieurs commits atomiques sur `main`. Les tests Jest sont lancés avant chaque push.

**Tech Stack:** React 19 + Vite, Node.js/Express 5, Prisma 7 + PostgreSQL, Zod, Jest + Supertest, Helmet, react-i18next

---

## Analyse préliminaire

| Issue | Titre | Statut | Complexité |
|-------|-------|--------|------------|
| #81 | Email validation à l'inscription | **Non-reproductible** — `registerSchema` a déjà `z.string().email()` | — |
| #59 | Google Fonts non-bloquant | À faire | Faible |
| #55 | Composant Stars dupliqué | À faire | Faible |
| #58 | Error Boundary racine | À faire | Faible |
| #60 | width/height sur les images | À faire | Faible |
| #71 | CSP Helmet | À faire | Faible |
| #75 | try/catch manquants dans les controllers | À faire | Faible |
| #73 | computeAvgRating dupliqué | À faire | Faible (helper existe déjà) |
| #78 | Index sur RecipeIngredient.recipeId et Step.recipeId | À faire | Moyen |
| #79 | onDelete: Cascade sur Recipe | À faire | Moyen (migration) |
| #69 | JWT refresh token | À faire | Élevé |
| #76 | Pagination sur GET /favorites | À faire | Moyen |
| #62 | SearchBar — navigation clavier + ARIA | À faire | Moyen |
| #80 | Tests collections, tags, variantes, upload | À faire | Élevé |

---

## Task 1: Fermer #81 (non-reproductible)

**Files:**
- `backend/src/schemas.js:80-87` — registerSchema déjà correct

- [ ] Vérifier que `registerSchema` a bien `z.string().email('Email invalide')`
- [ ] Fermer l'issue #81 avec un commentaire expliquant que la validation est déjà en place
- [ ] Ajouter un test `refuse si email invalide (400)` dans `auth.test.js`
- [ ] Lancer les tests : `cd backend && npm test -- --testPathPattern=auth`
- [ ] Commit: `test: add invalid email rejection test in auth (closes #81)`
- [ ] Push sur main

---

## Task 2: Google Fonts non-bloquant (#59)

**Files:**
- Modify: `frontend/index.html:11`

- [ ] Remplacer la balise `<link rel="stylesheet">` par `<link rel="preload" as="style" onload="this.rel='stylesheet'">` + `<noscript>` fallback
- [ ] Commit: `perf: load Google Fonts asynchronously to prevent render blocking (closes #59)`
- [ ] Push sur main

---

## Task 3: Extraire le composant Stars (#55)

**Files:**
- Create: `frontend/src/components/Stars.jsx`
- Modify: `frontend/src/components/RecipeCard.jsx:8-21`
- Modify: `frontend/src/components/RecipeCardGrid.jsx:7-17`

- [ ] Créer `Stars.jsx` avec la logique commune (valeur null → null, arrondi, ★☆)
- [ ] Remplacer dans RecipeCard et RecipeCardGrid par l'import
- [ ] Vérifier visuellement que le rendu est identique
- [ ] Commit: `refactor: extract Stars component to avoid duplication (closes #55)`
- [ ] Push sur main

---

## Task 4: Error Boundary (#58)

**Files:**
- Create: `frontend/src/components/ErrorBoundary.jsx`
- Modify: `frontend/src/App.jsx:167-186`

- [ ] Créer `ErrorBoundary.jsx` (class component, `componentDidCatch`, page friendly dark mode compatible)
- [ ] Wrapper `<Routes>` dans `App.jsx`
- [ ] Commit: `feat: add ErrorBoundary to prevent full app crash on runtime error (closes #58)`
- [ ] Push sur main

---

## Task 5: width/height sur les images (#60)

**Files:**
- Modify: `frontend/src/components/RecipeCard.jsx:46-50`
- Modify: `frontend/src/components/RecipeCardGrid.jsx:36-40`
- Lire RecipeDetail.jsx et LandingPage.jsx pour trouver les autres images

- [ ] Ajouter `width="96" height="80"` sur RecipeCard thumbnail
- [ ] Ajouter `width="400" height="176"` sur RecipeCardGrid
- [ ] Ajouter sur RecipeDetail hero + LandingPage
- [ ] Commit: `perf: add width/height to img tags to prevent CLS (closes #60)`
- [ ] Push sur main

---

## Task 6: CSP Helmet (#71)

**Files:**
- Modify: `backend/src/index.js:28-31`

- [ ] Configurer `contentSecurityPolicy` avec directives (defaultSrc, scriptSrc, styleSrc, fontSrc, imgSrc, connectSrc)
- [ ] Vérifier que le frontend fonctionne (header CSP présent, pas d'erreurs console)
- [ ] Commit: `fix(security): configure Content Security Policy instead of disabling it (closes #71)`
- [ ] Push sur main

---

## Task 7: try/catch manquants (#75)

**Files:**
- Modify: `backend/src/controllers/favorite-controller.js`
- Modify: `backend/src/controllers/notification-controller.js`
- Modify: `backend/src/controllers/tag-controller.js`
- Modify: `backend/src/controllers/follow-controller.js`

- [ ] Wrapper chaque function async avec try/catch + `next(err)`
- [ ] Lancer `cd backend && npm test`
- [ ] Commit: `fix: add try/catch to all async controllers for consistent error handling (closes #75)`
- [ ] Push sur main

---

## Task 8: Centraliser computeAvgRating (#73)

**Files:**
- `backend/src/helpers/recipe-helpers.js` — helper déjà là, exporter une version "simple" sans tags
- Modify: `backend/src/controllers/favorite-controller.js:45-51`
- Modify: `backend/src/controllers/user-controller.js:71-76,111-116`
- Modify: `backend/src/controllers/collection-controller.js:91-97`
- Modify: `backend/src/controllers/rating-controller.js:26-34` (cas différent : pas de recipe object complet)

- [ ] Ajouter `computeSimpleAvgRating(ratings)` dans `recipe-helpers.js` pour le cas sans recipe object
- [ ] Remplacer les calculs inline dans les 4 controllers
- [ ] Lancer `cd backend && npm test`
- [ ] Commit: `refactor: use shared computeAvgRating helper in all controllers (closes #73)`
- [ ] Push sur main

---

## Task 9: Index DB + onDelete Cascade (#78 + #79)

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] Ajouter `@@index([recipeId])` sur `RecipeIngredient` et `Step`
- [ ] Ajouter `onDelete: Cascade` sur `RecipeIngredient`, `Step`, `Comment`, `Rating`, `Favorite`
- [ ] Lancer `cd backend && npx prisma migrate dev --name add_indexes_and_cascade`
- [ ] Simplifier `deleteRecipe` : supprimer les `deleteMany` manuels redondants
- [ ] Lancer `cd backend && npm test -- --testPathPattern=cascade`
- [ ] Lancer `cd backend && npm test`
- [ ] Commit: `fix(data-model): add DB indexes and onDelete: Cascade on Recipe relations (closes #78, closes #79)`
- [ ] Push sur main

---

## Task 10: JWT Refresh Tokens (#69)

**Files:**
- Modify: `backend/prisma/schema.prisma` — ajouter modèle `RefreshToken`
- Modify: `backend/src/controllers/auth-controller.js`
- Modify: `backend/src/routes/auth-routes.js`
- Modify: `backend/src/middleware/auth.js`
- Modify: `frontend/src/contexts/AuthContext.jsx`

Stratégie: Option A — access token 15min, refresh token opaque 7j stocké en BDD.

- [ ] Ajouter `RefreshToken` model dans schema.prisma
- [ ] Lancer migration : `npx prisma migrate dev --name add_refresh_token`
- [ ] Modifier `register` et `login` : émettre access token 15min + refresh token
- [ ] Ajouter `POST /auth/refresh` qui valide le refresh token et émet un nouvel access token
- [ ] Ajouter `POST /auth/logout` qui invalide le refresh token
- [ ] Modifier `AuthContext.jsx` : stocker refreshToken, intercepter 401, retry avec refresh
- [ ] Lancer `cd backend && npm test -- --testPathPattern=auth`
- [ ] Commit: `feat(security): implement JWT refresh token mechanism (closes #69)`
- [ ] Push sur main

---

## Task 11: Pagination favoris (#76)

**Files:**
- Modify: `backend/src/controllers/favorite-controller.js`
- Modify: `frontend/src/pages/Favorites.jsx`

- [ ] Ajouter `page` et `limit` dans `getMyFavorites`, retourner `{ data, total, page, limit }`
- [ ] Mettre à jour `Favorites.jsx` pour consommer la nouvelle shape
- [ ] Lancer `cd backend && npm test -- --testPathPattern=favorite`
- [ ] Commit: `feat: add pagination to GET /favorites endpoint (closes #76)`
- [ ] Push sur main

---

## Task 12: SearchBar accessibilité (#62)

**Files:**
- Modify: `frontend/src/components/SearchBar.jsx`

- [ ] Ajouter `role="combobox"`, `aria-expanded`, `aria-haspopup`, `aria-autocomplete` sur l'input
- [ ] Ajouter `aria-activedescendant` pointant vers l'option active
- [ ] Ajouter `role="listbox"` sur le dropdown
- [ ] Ajouter `role="option"`, `aria-selected`, `id` unique sur chaque suggestion
- [ ] Gérer flèches haut/bas pour naviguer entre les options
- [ ] Commit: `feat(a11y): add keyboard navigation and ARIA roles to SearchBar dropdown (closes #62)`
- [ ] Push sur main

---

## Task 13: Tests manquants (#80)

**Files:**
- Create: `backend/tests/collection.test.js`
- Create: `backend/tests/tag.test.js`
- Create: `backend/tests/variant.test.js`
- Create: `backend/tests/upload.test.js`

- [ ] `collection.test.js`: CRUD, ajout/retrait recette, limite 20 collections, limite 100 recettes, accès privé, doublon 409
- [ ] `tag.test.js`: GET /tags avec recipesCount, tagNames résolus à la création de recette, filtrage ?tags=
- [ ] `variant.test.js`: création variante, rejet si parent non PUBLISHED, rejet si parent est variante
- [ ] `upload.test.js`: image valide → 200, non-image → 400, sans fichier → 400
- [ ] Lancer `cd backend && npm test`
- [ ] Commit: `test: add collection, tag, variant and upload test suites (closes #80)`
- [ ] Push sur main

---

## Vérification finale

- [ ] `cd backend && npm test` — tous les tests passent
- [ ] `cd frontend && npm run build` — build sans erreur
- [ ] Récapitulatif des issues résolues

