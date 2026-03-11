const prisma = require('../prisma');

// Inclusions réutilisables
const includeDetail = {
  category: true,
  ingredients: {
    include: { ingredient: true },
  },
  steps: {
    orderBy: { order: 'asc' },
  },
};

// GET /recipes
const getAllRecipes = async (req, res) => {
  const recipes = await prisma.recipe.findMany({
    include: { category: true },
    orderBy: { name: 'asc' },
  });
  res.json(recipes);
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

  res.json(recipe);
};

// POST /recipes
// Body attendu : { name, description?, imageUrl?, difficulty, prepTime, categoryId, ingredients?, steps? }
// ingredients : [{ ingredientId, quantity, unit }]
// steps : [{ order, description }]
const createRecipe = async (req, res) => {
  const { name, description, imageUrl, difficulty, prepTime, categoryId, ingredients = [], steps = [] } = req.body;

  const recipe = await prisma.recipe.create({
    data: {
      name,
      description,
      imageUrl,
      difficulty,
      prepTime,
      categoryId,
      ingredients: {
        create: ingredients.map(({ ingredientId, quantity, unit }) => ({
          quantity,
          unit,
          ingredient: { connect: { id: ingredientId } },
        })),
      },
      steps: {
        create: steps.map(({ order, description }) => ({ order, description })),
      },
    },
    include: includeDetail,
  });

  res.status(201).json(recipe);
};

// PUT /recipes/:id
// On supprime et recrée les ingrédients et étapes pour simplifier
const updateRecipe = async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, description, imageUrl, difficulty, prepTime, categoryId, ingredients, steps } = req.body;

  // Vérifier que la recette existe
  const exists = await prisma.recipe.findUnique({ where: { id } });
  if (!exists) {
    return res.status(404).json({ error: 'Recette introuvable' });
  }

  // Mise à jour dans une transaction
  const recipe = await prisma.$transaction(async (tx) => {
    // Supprimer les ingrédients et étapes existants si fournis
    if (ingredients !== undefined) {
      await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
    }
    if (steps !== undefined) {
      await tx.step.deleteMany({ where: { recipeId: id } });
    }

    return tx.recipe.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(difficulty !== undefined && { difficulty }),
        ...(prepTime !== undefined && { prepTime }),
        ...(categoryId !== undefined && { categoryId }),
        ...(ingredients !== undefined && {
          ingredients: {
            create: ingredients.map(({ ingredientId, quantity, unit }) => ({
              quantity,
              unit,
              ingredient: { connect: { id: ingredientId } },
            })),
          },
        }),
        ...(steps !== undefined && {
          steps: {
            create: steps.map(({ order, description }) => ({ order, description })),
          },
        }),
      },
      include: includeDetail,
    });
  });

  res.json(recipe);
};

// DELETE /recipes/:id
const deleteRecipe = async (req, res) => {
  const id = parseInt(req.params.id);

  const exists = await prisma.recipe.findUnique({ where: { id } });
  if (!exists) {
    return res.status(404).json({ error: 'Recette introuvable' });
  }

  // Supprimer les dépendances avant la recette
  await prisma.$transaction([
    prisma.recipeIngredient.deleteMany({ where: { recipeId: id } }),
    prisma.step.deleteMany({ where: { recipeId: id } }),
    prisma.recipe.delete({ where: { id } }),
  ]);

  res.status(204).send();
};

module.exports = { getAllRecipes, getRecipeById, createRecipe, updateRecipe, deleteRecipe };
