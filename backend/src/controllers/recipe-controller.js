const prisma = require('../prisma');

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

// GET /recipes?page=1&limit=10&search=moji&category=2&status=PUBLISHED
const getAllRecipes = async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
  const { search, category, status } = req.query;

  const where = {};
  // Les non-admins ne voient que les recettes publiées
  if (req.user?.role === 'ADMIN' && status) {
    where.status = status;
  } else if (req.user?.role === 'ADMIN') {
    // admin sans filtre : tout voir
  } else {
    where.status = 'PUBLISHED';
  }
  if (search)   where.name = { contains: search, mode: 'insensitive' };
  if (category) where.categoryId = parseInt(category);

  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      include: {
        category: true,
        author: { select: { id: true, pseudo: true } },
        ratings: { select: { score: true } },
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.recipe.count({ where }),
  ]);

  res.json({ data: recipes.map(computeAvgRating), total, page, limit });
};

// GET /recipes/:id
const getRecipeById = async (req, res) => {
  const id = parseInt(req.params.id);
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: includeDetail,
  });

  if (!recipe) {
    return res.status(404).json({ error: 'Recette introuvable' });
  }

  // Les non-admins ne peuvent pas voir les recettes en attente (sauf leur auteur)
  if (recipe.status === 'PENDING') {
    const isAdmin = req.user?.role === 'ADMIN';
    const isAuthor = req.user?.id === recipe.authorId;
    if (!isAdmin && !isAuthor) {
      return res.status(404).json({ error: 'Recette introuvable' });
    }
  }

  res.json(computeAvgRating(recipe));
};

// POST /recipes — auth requise
// ingredients : [{ ingredientId, quantity, unit }] OU [{ name, quantity, unit }]
// steps       : [{ order, description }]
const createRecipe = async (req, res) => {
  const { name, description, imageUrl, difficulty, prepTime, categoryId, ingredients = [], steps = [] } = req.body;

  // Les admins publient directement, les users soumettent en attente
  const status = req.user.role === 'ADMIN' ? 'PUBLISHED' : 'PENDING';
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
          create: steps.map(({ order, description }) => ({ order: parseInt(order), description })),
        },
      },
      include: includeDetail,
    });

    res.status(201).json(computeAvgRating(recipe));
  } catch (err) {
    handlePrismaError(err, res);
  }
};

// PUT /recipes/:id — auth requise (auteur ou admin)
const updateRecipe = async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, description, imageUrl, difficulty, prepTime, categoryId, ingredients, steps } = req.body;

  const exists = await prisma.recipe.findUnique({ where: { id } });
  if (!exists) {
    return res.status(404).json({ error: 'Recette introuvable' });
  }

  // Seul l'auteur ou un admin peut modifier
  if (req.user.role !== 'ADMIN' && exists.authorId !== req.user.id) {
    return res.status(403).json({ error: 'Non autorisé' });
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
          ...(categoryId  !== undefined && { categoryId: parseInt(categoryId) }),
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
              create: steps.map(({ order, description }) => ({ order: parseInt(order), description })),
            },
          }),
        },
        include: includeDetail,
      });
    });

    res.json(computeAvgRating(recipe));
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
};

module.exports = { getAllRecipes, getRecipeById, createRecipe, updateRecipe, deleteRecipe, publishRecipe };
