const { z } = require('zod');
const prisma = require('../prisma');
const { createNotification, notifyFollowers } = require('../services/notification-service');
const { invalidateCacheByPattern } = require('../cache');

// Invalide toutes les entrées de cache liées aux recettes
const bustRecipeCache = () => invalidateCacheByPattern('/recipes*').catch(() => {});

// Schéma de validation des query params de GET /recipes
const recipeListSchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
  q:          z.string().min(2).max(100).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  minRating:  z.coerce.number().min(0).max(5).optional(),
  maxTime:    z.coerce.number().int().positive().optional(),
  authorId:   z.coerce.number().int().positive().optional(),
  status:     z.enum(['PUBLISHED', 'PENDING', 'DRAFT']).optional(),
  sortBy:     z.enum(['createdAt', 'prepTime', 'avgRating', 'favoritesCount']).default('createdAt'),
  sortOrder:  z.enum(['asc', 'desc']).default('desc'),
});

// Inclusions réutilisables
const includeDetail = {
  category: true,
  author: {
    select: { id: true, pseudo: true, avatar: true },
  },
  ingredients: {
    include: { ingredient: true },
  },
  steps: {
    orderBy: { order: 'asc' },
  },
  ratings: {
    select: { score: true },
  },
};

// Calcule la moyenne des notes d'une recette
const computeAvgRating = (recipe) => {
  const { ratings, ...rest } = recipe;
  const avgRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length) * 10) / 10
      : null;
  return { ...rest, avgRating, ratingsCount: ratings.length };
};

// Convertit les erreurs Prisma connues en réponses HTTP appropriées
const handlePrismaError = (err, res) => {
  if (err.code === 'P2003') {
    return res.status(400).json({ error: 'Référence invalide : categoryId ou ingredientId inexistant' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Recette introuvable' });
  }
  throw err;
};

// Résout les ingrédients : accepte { ingredientId } OU { name } (upsert)
const resolveIngredients = async (ingredients) => {
  return Promise.all(
    ingredients.map(async ({ ingredientId, name, quantity, unit }) => {
      if (name) {
        const ingredient = await prisma.ingredient.upsert({
          where: { name },
          create: { name },
          update: {},
        });
        return { id: ingredient.id, quantity, unit };
      }
      return { id: ingredientId, quantity, unit };
    })
  );
};

// GET /recipes?page=1&limit=20&q=mojito&categoryId=2&minRating=4&maxTime=10&authorId=1&status=PUBLISHED
const getAllRecipes = async (req, res) => {
  const parsed = recipeListSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }

  const { page, limit, q, categoryId, minRating, maxTime, authorId, status, sortBy, sortOrder } = parsed.data;
  const offset = (page - 1) * limit;

  // Clause where de base (sans q ni minRating)
  const where = {};
  if (req.user?.role === 'ADMIN' && status) {
    where.status = status;
  } else if (req.user?.role === 'ADMIN') {
    // admin sans filtre : voit tout
  } else if (status === 'DRAFT' && req.user) {
    // utilisateur connecté qui demande ses brouillons : seulement les siens
    where.status  = 'DRAFT';
    where.authorId = req.user.id;
  } else {
    where.status = 'PUBLISHED';
  }
  if (categoryId !== undefined) where.categoryId = categoryId;
  if (maxTime    !== undefined) where.prepTime    = { lte: maxTime };
  if (authorId   !== undefined) where.authorId    = authorId;

  // minRating : sous-requête raw (avgRating n'est pas une colonne)
  let minRatingIds = null;
  if (minRating !== undefined) {
    const rows = await prisma.$queryRaw`
      SELECT "recipeId"::int FROM "Rating"
      GROUP BY "recipeId"
      HAVING AVG(score) >= ${minRating}
    `;
    minRatingIds = rows.map(r => r.recipeId);
  }

  // ----------------------------------------------------------------
  // Branche A : recherche textuelle présente → ordre par pertinence
  // ----------------------------------------------------------------
  if (q) {
    const clean = q.replace(/[^a-zA-ZÀ-ÿ0-9 -]/g, ' ').trim();
    const tsquery = clean.split(/\s+/).filter(Boolean).map(w => `${w}:*`).join(' & ');

    // IDs full-text ordonnés par rang
    const searchRows = await prisma.$queryRaw`
      SELECT id, ts_rank("searchVector", to_tsquery('french', ${tsquery})) AS rank
      FROM "Recipe"
      WHERE "searchVector" @@ to_tsquery('french', ${tsquery})
      ORDER BY rank DESC
    `;
    const searchIds = searchRows.map(r => r.id);

    // IDs satisfaisant les autres filtres (base + minRating)
    const filterWhere = { ...where };
    if (minRatingIds !== null) {
      filterWhere.id = { in: minRatingIds.length > 0 ? minRatingIds : [-1] };
    }
    const filterRows = await prisma.recipe.findMany({ where: filterWhere, select: { id: true } });
    const filterIdSet = new Set(filterRows.map(r => r.id));

    // Intersection ordonnée par rang
    const orderedIds = searchIds.filter(id => filterIdSet.has(id));
    const total      = orderedIds.length;
    const pageIds    = orderedIds.slice(offset, offset + limit);

    if (pageIds.length === 0) {
      return res.json({ data: [], total, page, limit });
    }

    const recipes = await prisma.recipe.findMany({
      where: { id: { in: pageIds } },
      include: {
        category: true,
        author: { select: { id: true, pseudo: true } },
        ratings: { select: { score: true } },
      },
    });
    const ranked = pageIds.map(id => recipes.find(r => r.id === id)).filter(Boolean);
    return res.json({ data: ranked.map(computeAvgRating), total, page, limit });
  }

  // ----------------------------------------------------------------
  // Branche B : pas de q → Prisma findMany classique
  // ----------------------------------------------------------------
  if (minRatingIds !== null) {
    where.id = { in: minRatingIds.length > 0 ? minRatingIds : [-1] };
  }

  // Tri par avgRating ou favoritesCount nécessite un raw SQL ou un post-sort
  const needsAggSort = sortBy === 'avgRating' || sortBy === 'favoritesCount';

  if (needsAggSort) {
    // Récupère toutes les recettes filtrées sans pagination pour trier côté app
    const allRecipes = await prisma.recipe.findMany({
      where,
      include: {
        category: true,
        author: { select: { id: true, pseudo: true } },
        ratings: { select: { score: true } },
        _count: { select: { favorites: true } },
      },
    });

    const withAgg = allRecipes.map((r) => {
      const { ratings, _count, ...rest } = r;
      const avgRating = ratings.length > 0
        ? Math.round((ratings.reduce((s, x) => s + x.score, 0) / ratings.length) * 10) / 10
        : null;
      return { ...rest, avgRating, ratingsCount: ratings.length, favoritesCount: _count.favorites };
    });

    const dir = sortOrder === 'asc' ? 1 : -1;
    withAgg.sort((a, b) => {
      const av = sortBy === 'avgRating' ? (a.avgRating ?? -Infinity) : a.favoritesCount;
      const bv = sortBy === 'avgRating' ? (b.avgRating ?? -Infinity) : b.favoritesCount;
      return dir * (av - bv);
    });

    const total = withAgg.length;
    const data  = withAgg.slice(offset, offset + limit).map(({ favoritesCount, ...r }) => r);
    return res.json({ data, total, page, limit });
  }

  // Tri standard Prisma
  const orderBy = { [sortBy]: sortOrder };

  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      include: {
        category: true,
        author: { select: { id: true, pseudo: true } },
        ratings: { select: { score: true } },
      },
      orderBy,
      skip: offset,
      take: limit,
    }),
    prisma.recipe.count({ where }),
  ]);

  res.json({ data: recipes.map(computeAvgRating), total, page, limit });
};

// GET /recipes/:id
const getRecipeById = async (req, res) => {
  const id = parseInt(req.params.id);

  const [recipe, ratingAgg] = await Promise.all([
    prisma.recipe.findUnique({
      where: { id },
      include: {
        category: true,
        author:   { select: { id: true, pseudo: true, avatar: true } },
        ingredients: { include: { ingredient: true } },
        steps:    { orderBy: { order: 'asc' } },
      },
    }),
    prisma.rating.aggregate({
      where:  { recipeId: id },
      _avg:   { score: true },
      _count: { score: true },
    }),
  ]);

  if (!recipe) {
    return res.status(404).json({ error: 'Recette introuvable' });
  }

  // Les non-admins ne peuvent pas voir les recettes non publiées (sauf leur auteur)
  if (recipe.status === 'PENDING' || recipe.status === 'DRAFT') {
    const isAdmin  = req.user?.role === 'ADMIN';
    const isAuthor = req.user?.id === recipe.authorId;
    if (!isAdmin && !isAuthor) {
      return res.status(404).json({ error: 'Recette introuvable' });
    }
  }

  const avgRating    = ratingAgg._avg.score !== null
    ? Math.round(ratingAgg._avg.score * 10) / 10
    : null;
  const ratingsCount = ratingAgg._count.score;

  // Données spécifiques à l'utilisateur connecté (isFavorited, note personnelle)
  let userFields = {};
  if (req.user) {
    const [fav, userRating] = await Promise.all([
      prisma.favorite.findUnique({
        where: { userId_recipeId: { userId: req.user.id, recipeId: id } },
      }),
      prisma.rating.findUnique({
        where: { userId_recipeId: { userId: req.user.id, recipeId: id } },
      }),
    ]);
    userFields = { isFavorited: !!fav, userScore: userRating?.score ?? null };
  }

  res.json({ ...recipe, avgRating, ratingsCount, ...userFields });
};

// POST /recipes — auth requise
// ingredients : [{ ingredientId, quantity, unit }] OU [{ name, quantity, unit }]
// steps       : [{ order, description }]
const createRecipe = async (req, res) => {
  const { name, description, imageUrl, difficulty, prepTime, servings, categoryId, ingredients = [], steps = [], status: requestedStatus } = req.body;

  // Calcul du statut final selon le rôle
  let status;
  if (req.user.role === 'ADMIN') {
    status = ['PUBLISHED', 'DRAFT', 'PENDING'].includes(requestedStatus) ? requestedStatus : 'PUBLISHED';
  } else {
    // Un USER ne peut créer qu'en DRAFT ou PENDING (pas PUBLISHED directement)
    status = requestedStatus === 'DRAFT' ? 'DRAFT' : 'PENDING';
  }
  const authorId = req.user.id;

  try {
    const resolved = await resolveIngredients(ingredients);

    const recipe = await prisma.recipe.create({
      data: {
        name,
        description,
        imageUrl,
        difficulty,
        prepTime: parseInt(prepTime),
        servings: servings ? parseInt(servings) : null,
        categoryId: parseInt(categoryId),
        status,
        authorId,
        ingredients: {
          create: resolved.map(({ id, quantity, unit }) => ({
            quantity: parseFloat(quantity),
            unit,
            ingredient: { connect: { id } },
          })),
        },
        steps: {
          create: steps.map(({ order, description, imageUrl: stepImg }) => ({
            order: parseInt(order),
            description,
            ...(stepImg ? { imageUrl: stepImg } : {}),
          })),
        },
      },
      include: includeDetail,
    });

    res.status(201).json(computeAvgRating(recipe));

    bustRecipeCache();

    // Notifier les followers si publication directe (admin) — fire and forget
    if (status === 'PUBLISHED') {
      notifyFollowers({
        authorId,
        type: 'NEW_RECIPE',
        data: {
          recipeId:     recipe.id,
          recipeName:   recipe.name,
          authorId,
          authorPseudo: recipe.author?.pseudo ?? null,
        },
      }).catch(console.error);
    }
  } catch (err) {
    handlePrismaError(err, res);
  }
};

// PUT /recipes/:id — auth requise (auteur ou admin)
const updateRecipe = async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, description, imageUrl, difficulty, prepTime, servings, categoryId, ingredients, steps, status: requestedStatus } = req.body;

  const exists = await prisma.recipe.findUnique({ where: { id } });
  if (!exists) {
    return res.status(404).json({ error: 'Recette introuvable' });
  }

  // Seul l'auteur ou un admin peut modifier
  if (req.user.role !== 'ADMIN' && exists.authorId !== req.user.id) {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  // Calcul du statut final (les users ne peuvent pas passer directement en PUBLISHED)
  let newStatus;
  if (requestedStatus !== undefined) {
    if (req.user.role === 'ADMIN') {
      newStatus = requestedStatus;
    } else if (requestedStatus !== 'PUBLISHED') {
      newStatus = requestedStatus;
    }
  }

  try {
    const resolved = ingredients !== undefined ? await resolveIngredients(ingredients) : undefined;

    const recipe = await prisma.$transaction(async (tx) => {
      if (resolved !== undefined) {
        await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
      }
      if (steps !== undefined) {
        await tx.step.deleteMany({ where: { recipeId: id } });
      }

      return tx.recipe.update({
        where: { id },
        data: {
          ...(name        !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(imageUrl    !== undefined && { imageUrl }),
          ...(difficulty  !== undefined && { difficulty }),
          ...(prepTime    !== undefined && { prepTime: parseInt(prepTime) }),
          ...(servings    !== undefined && { servings: servings ? parseInt(servings) : null }),
          ...(categoryId  !== undefined && { categoryId: parseInt(categoryId) }),
          ...(newStatus   !== undefined && { status: newStatus }),
          ...(resolved    !== undefined && {
            ingredients: {
              create: resolved.map(({ id: ingId, quantity, unit }) => ({
                quantity: parseFloat(quantity),
                unit,
                ingredient: { connect: { id: ingId } },
              })),
            },
          }),
          ...(steps !== undefined && {
            steps: {
              create: steps.map(({ order, description, imageUrl: stepImg }) => ({
                order: parseInt(order),
                description,
                ...(stepImg ? { imageUrl: stepImg } : {}),
              })),
            },
          }),
        },
        include: includeDetail,
      });
    });

    res.json(computeAvgRating(recipe));
    bustRecipeCache();
  } catch (err) {
    handlePrismaError(err, res);
  }
};

// DELETE /recipes/:id — auth requise (auteur ou admin)
const deleteRecipe = async (req, res) => {
  const id = parseInt(req.params.id);

  const exists = await prisma.recipe.findUnique({ where: { id } });
  if (!exists) {
    return res.status(404).json({ error: 'Recette introuvable' });
  }

  if (req.user.role !== 'ADMIN' && exists.authorId !== req.user.id) {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  await prisma.$transaction([
    prisma.comment.deleteMany({ where: { recipeId: id } }),
    prisma.rating.deleteMany({ where: { recipeId: id } }),
    prisma.favorite.deleteMany({ where: { recipeId: id } }),
    prisma.recipeIngredient.deleteMany({ where: { recipeId: id } }),
    prisma.step.deleteMany({ where: { recipeId: id } }),
    prisma.recipe.delete({ where: { id } }),
  ]);

  res.status(204).send();
  bustRecipeCache();
};

// PATCH /recipes/:id/publish — admin seulement
const publishRecipe = async (req, res) => {
  const id = parseInt(req.params.id);

  const recipe = await prisma.recipe.findUnique({ where: { id } });
  if (!recipe) return res.status(404).json({ error: 'Recette introuvable' });

  const updated = await prisma.recipe.update({
    where: { id },
    data: { status: 'PUBLISHED' },
    include: includeDetail,
  });

  res.json(computeAvgRating(updated));
  bustRecipeCache();

  // Notifications fire and forget
  if (recipe.authorId) {
    // Notifier l'auteur : sa recette a été approuvée
    createNotification({
      userId: recipe.authorId,
      type:   'RECIPE_APPROVED',
      data:   { recipeId: recipe.id, recipeName: recipe.name },
    }).catch(console.error);

    // Notifier les followers de l'auteur : nouvelle recette publiée
    notifyFollowers({
      authorId:     recipe.authorId,
      type:         'NEW_RECIPE',
      data: {
        recipeId:     recipe.id,
        recipeName:   recipe.name,
        authorId:     recipe.authorId,
        authorPseudo: updated.author?.pseudo ?? null,
      },
    }).catch(console.error);
  }
};

// PATCH /recipes/:id/unpublish — auteur ou admin
const unpublishRecipe = async (req, res) => {
  const id = parseInt(req.params.id);

  const recipe = await prisma.recipe.findUnique({ where: { id } });
  if (!recipe) return res.status(404).json({ error: 'Recette introuvable' });

  if (req.user.role !== 'ADMIN' && recipe.authorId !== req.user.id) {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  const updated = await prisma.recipe.update({
    where: { id },
    data: { status: 'DRAFT' },
    include: includeDetail,
  });

  res.json(computeAvgRating(updated));
  bustRecipeCache();
};

// GET /recipes/search?q=mojito&page=1&limit=20
const searchRecipes = async (req, res) => {
  const { q } = req.query;
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Le paramètre q doit contenir au moins 2 caractères' });
  }

  // Sanitisation : on ne garde que lettres, chiffres, espaces et tirets
  const clean = q.replace(/[^a-zA-ZÀ-ÿ0-9 -]/g, ' ').trim();
  if (!clean) {
    return res.status(400).json({ error: 'Requête de recherche invalide' });
  }

  // Chaque mot devient un préfixe (ex : "mo" → "mo:*") pour la recherche partielle
  const tsquery = clean.split(/\s+/).filter(Boolean).map(w => `${w}:*`).join(' & ');

  const [rows, countResult] = await Promise.all([
    prisma.$queryRaw`
      SELECT id, ts_rank("searchVector", to_tsquery('french', ${tsquery})) AS rank
      FROM "Recipe"
      WHERE status = 'PUBLISHED'
        AND "searchVector" @@ to_tsquery('french', ${tsquery})
      ORDER BY rank DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM "Recipe"
      WHERE status = 'PUBLISHED'
        AND "searchVector" @@ to_tsquery('french', ${tsquery})
    `,
  ]);

  const ids = rows.map(r => r.id);
  const total = countResult[0].count;

  if (ids.length === 0) {
    return res.json({ data: [], total: 0, page, limit });
  }

  // Récupérer les recettes avec leurs relations
  const recipes = await prisma.recipe.findMany({
    where: { id: { in: ids } },
    include: {
      category: true,
      author: { select: { id: true, pseudo: true } },
      ratings: { select: { score: true } },
    },
  });

  // Réordonner selon le rang de pertinence
  const ranked = ids.map(id => recipes.find(r => r.id === id)).filter(Boolean);

  res.json({ data: ranked.map(computeAvgRating), total, page, limit });
};

// GET /feed?cursor=123&limit=20 — JWT requis, pagination par curseur
const getFeed = async (req, res) => {
  const limit  = Math.min(20, Math.max(1, parseInt(req.query.limit) || 20));
  const cursor = req.query.cursor ? parseInt(req.query.cursor) : null;

  // IDs des utilisateurs suivis
  const follows = await prisma.follow.findMany({
    where:  { followerId: req.user.id },
    select: { followingId: true },
  });
  const followingIds = follows.map((f) => f.followingId);

  if (followingIds.length === 0) {
    return res.json({ data: [], nextCursor: null });
  }

  const where = {
    authorId: { in: followingIds },
    status: 'PUBLISHED',
    ...(cursor ? { id: { lt: cursor } } : {}),
  };

  // On prend limit+1 pour détecter s'il reste des résultats
  const recipes = await prisma.recipe.findMany({
    where,
    include: {
      category: true,
      author: { select: { id: true, pseudo: true } },
      ratings: { select: { score: true } },
    },
    orderBy: { id: 'desc' },
    take: limit + 1,
  });

  const hasMore    = recipes.length > limit;
  const data       = hasMore ? recipes.slice(0, limit) : recipes;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  res.json({ data: data.map(computeAvgRating), nextCursor });
};

module.exports = { getAllRecipes, getRecipeById, createRecipe, updateRecipe, deleteRecipe, publishRecipe, unpublishRecipe, searchRecipes, getFeed };
