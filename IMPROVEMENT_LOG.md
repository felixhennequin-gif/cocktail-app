# Auto-Improvement Log — 2026-04-03

## Completed

### [SECURITY] Task 1.1: JWT algorithm vulnerability
- **Status**: Already fixed
- `jwt.verify()` already uses `{ algorithms: ['HS256'] }` in both `requireAuth` and `optionalAuth` middleware

### [SECURITY] Task 1.2: authFetch race condition on concurrent 401s
- **Status**: Already fixed
- `refreshPromiseRef` deduplication already implemented in `AuthContext.jsx`

### [PERF] Task 1.3: Fix Redis cache middleware bug
- **File**: `backend/src/cache.js`
- **What was wrong**: `lazyConnect: true` was set but `client.connect()` was never called, meaning Redis would silently fail on all operations since `enableOfflineQueue: false` rejects commands before connection
- **Fix**: Added `client.connect().catch()` after Redis client creation

### [PERF] Task 2.2: Add missing database indexes
- **File**: `backend/prisma/schema.prisma`
- **What was added**: `@@index([parentRecipeId])` and `@@index([season])` on Recipe model
- **Why**: `parentRecipeId` used for variant lookups, `season` used in WHERE clauses for seasonal recipe filtering

### [QUALITY] Task 3.2 + 3.3: Standardize error handling across controllers
- **Files**: 9 controllers modified
- **What was wrong**: Raw `res.status(N).json({ error: ... })` calls instead of standardized error helpers
- **Fix**: Replaced all raw error responses with `badRequest()`, `notFound()`, `forbidden()`, `validationError()`, `sendError()` from `helpers/errors.js`
- **Controllers fixed**: article, category, ingredient, api-key, newsletter, curated, tag, recipe, push
- **Also**: Added missing `try/catch` + `next(err)` to `getAllCategories`, removed unused `slugify` import from category-controller

### [QUALITY] Task 5.2: Fix tag counts to only count PUBLISHED recipes
- **File**: `backend/src/controllers/tag-controller.js`
- **What was wrong**: `getAllTags` counted ALL recipes (including PENDING/DRAFT) in `recipesCount`
- **Fix**: Added `where: { recipe: { status: 'PUBLISHED' } }` filter to the `_count` select

### [UX-FIX] Task 5.1: Fix TastingModal focus trapping
- **File**: `frontend/src/components/TastingModal.jsx`
- **What was wrong**: No keyboard focus trapping (Tab escaped the modal, Escape didn't close it)
- **Fix**: Added `useEffect` with focus trap logic (Tab cycles within modal, Shift+Tab reverse, Escape closes), auto-focus on first focusable element, `ref` on modal panel

## Skipped (already correct)

- **Task 2.1**: N+1 query audit — all controllers use proper `include`/`select`, `Promise.all()` batching, no loop queries
- **Task 2.3**: React re-renders — `useCompare` uses stable callbacks via `useCallback`, `RecipeCard`/`RecipeCardGrid` properly memoized, no obvious wasted renders
- **Task 3.1**: Dead code removal — no significant dead code found (unused imports, commented blocks, unreachable code)
- **Task 3.4**: Missing input validation — all POST/PUT/PATCH endpoints already validate via Zod schemas or manual checks
- **Task 4.1-4.2**: DX improvements (JSDoc, naming) — skipped as low priority and codebase already well-structured
- **Task 5.2**: Tag count `dynamicTagCounts` bug — the described state variable doesn't exist; current implementation correctly updates tag counts from API response
- **Task 5.3**: Missing loading states — all pages already have proper loading indicators (Skeleton, spinners, or text)

## Failed

None.

## Time spent
- Total: ~25 minutes
- Tasks completed: 6 (with code changes)
- Tasks skipped: 7 (already correct / not applicable)
- Tasks failed: 0
