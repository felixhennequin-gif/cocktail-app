const prisma = require('../prisma');
const { parseId } = require('../helpers');

const MAX_COLLECTIONS_PER_USER = 20;
const MAX_RECIPES_PER_COLLECTION = 100;
const MAX_DESCRIPTION_LENGTH = 500;

// POST /collections
const createCollection = async (req, res) => {
  const userId = req.user.id;
  const { name, description, isPublic } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Le nom est requis' });
  }
  if (name.trim().length > 100) {
    return res.status(400).json({ error: 'Le nom ne doit pas dépasser 100 caractères' });
  }
  if (description && description.trim().length > MAX_DESCRIPTION_LENGTH) {
    return res.status(400).json({ error: `La description ne doit pas dépasser ${MAX_DESCRIPTION_LENGTH} caractères` });
  }

  // Vérifier la limite
  const count = await prisma.collection.count({ where: { userId } });
  if (count >= MAX_COLLECTIONS_PER_USER) {
    return res.status(400).json({ error: `Vous ne pouvez pas créer plus de ${MAX_COLLECTIONS_PER_USER} collections` });
  }

  const collection = await prisma.collection.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      isPublic: isPublic !== undefined ? isPublic : true,
      userId,
    },
  });

  res.status(201).json(collection);
};

// GET /collections/me
const getMyCollections = async (req, res) => {
  const userId = req.user.id;

  const collections = await prisma.collection.findMany({
    where: { userId },
    include: {
      _count: { select: { recipes: true } },
      recipes: {
        take: 1,
        orderBy: { addedAt: 'desc' },
        include: {
          recipe: { select: { imageUrl: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json(collections.map(({ _count, recipes, ...c }) => ({
    ...c,
    recipesCount: _count.recipes,
    previewImage: recipes[0]?.recipe?.imageUrl || null,
  })));
};

// GET /collections/:id
const getCollectionById = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'id invalide' });

  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, pseudo: true, avatar: true } },
      recipes: {
        orderBy: { addedAt: 'desc' },
        include: {
          recipe: {
            include: {
              category: true,
              author: { select: { id: true, pseudo: true } },
              ratings: { select: { score: true } },
            },
          },
        },
      },
    },
  });

  if (!collection) {
    return res.status(404).json({ error: 'Collection introuvable' });
  }

  // Collection privée : seul le propriétaire peut la voir
  if (!collection.isPublic && collection.userId !== req.user?.id) {
    return res.status(404).json({ error: 'Collection introuvable' });
  }

  // Calculer avgRating pour chaque recette
  const recipes = collection.recipes.map(({ recipe }) => {
    const { ratings, ...rest } = recipe;
    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((s, r) => s + r.score, 0) / ratings.length) * 10) / 10
      : null;
    return { ...rest, avgRating, ratingsCount: ratings.length };
  });

  const { recipes: _, ...collectionData } = collection;
  res.json({ ...collectionData, recipes });
};

// PUT /collections/:id
const updateCollection = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'id invalide' });

  const { name, description, isPublic } = req.body;

  const collection = await prisma.collection.findUnique({ where: { id } });
  if (!collection) return res.status(404).json({ error: 'Collection introuvable' });
  if (collection.userId !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });

  if (name !== undefined && name.trim().length === 0) {
    return res.status(400).json({ error: 'Le nom est requis' });
  }
  if (name !== undefined && name.trim().length > 100) {
    return res.status(400).json({ error: 'Le nom ne doit pas dépasser 100 caractères' });
  }
  if (description !== undefined && description && description.trim().length > MAX_DESCRIPTION_LENGTH) {
    return res.status(400).json({ error: `La description ne doit pas dépasser ${MAX_DESCRIPTION_LENGTH} caractères` });
  }

  const updated = await prisma.collection.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(isPublic !== undefined && { isPublic }),
    },
  });

  res.json(updated);
};

// DELETE /collections/:id
const deleteCollection = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'id invalide' });

  const collection = await prisma.collection.findUnique({ where: { id } });
  if (!collection) return res.status(404).json({ error: 'Collection introuvable' });
  if (collection.userId !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });

  await prisma.collection.delete({ where: { id } });
  res.status(204).send();
};

// POST /collections/:id/recipes
const addRecipeToCollection = async (req, res) => {
  const collectionId = parseId(req.params.id);
  if (!collectionId) return res.status(400).json({ error: 'id invalide' });

  const recipeId = parseId(req.body.recipeId);
  if (!recipeId) return res.status(400).json({ error: 'recipeId invalide' });

  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    include: { _count: { select: { recipes: true } } },
  });
  if (!collection) return res.status(404).json({ error: 'Collection introuvable' });
  if (collection.userId !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });

  if (collection._count.recipes >= MAX_RECIPES_PER_COLLECTION) {
    return res.status(400).json({ error: `Une collection ne peut pas contenir plus de ${MAX_RECIPES_PER_COLLECTION} recettes` });
  }

  // Vérifier que la recette existe
  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe) return res.status(404).json({ error: 'Recette introuvable' });

  try {
    await prisma.collectionRecipe.create({
      data: { collectionId, recipeId },
    });
    res.status(201).json({ added: true });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Cette recette est déjà dans la collection' });
    }
    throw err;
  }
};

// DELETE /collections/:id/recipes/:recipeId
const removeRecipeFromCollection = async (req, res) => {
  const collectionId = parseId(req.params.id);
  if (!collectionId) return res.status(400).json({ error: 'id invalide' });

  const recipeId = parseId(req.params.recipeId);
  if (!recipeId) return res.status(400).json({ error: 'recipeId invalide' });

  const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
  if (!collection) return res.status(404).json({ error: 'Collection introuvable' });
  if (collection.userId !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });

  try {
    await prisma.collectionRecipe.delete({
      where: { collectionId_recipeId: { collectionId, recipeId } },
    });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Recette non trouvée dans cette collection' });
    }
    throw err;
  }
};

module.exports = {
  createCollection,
  getMyCollections,
  getCollectionById,
  updateCollection,
  deleteCollection,
  addRecipeToCollection,
  removeRecipeFromCollection,
};
