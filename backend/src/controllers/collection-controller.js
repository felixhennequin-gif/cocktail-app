const prisma = require('../prisma');
const { parseId, badRequest, notFound, forbidden, conflict } = require('../helpers');
const { createCollectionSchema, updateCollectionSchema, formatZodError } = require('../schemas');
const { enrichRecipes } = require('../helpers/recipe-helpers');

const MAX_COLLECTIONS_PER_USER = 20;
const MAX_RECIPES_PER_COLLECTION = 100;

// POST /collections
const createCollection = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const parsed = createCollectionSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, formatZodError(parsed.error));
    }

    const { name, description, isPublic } = parsed.data;

    // Vérifier la limite
    const count = await prisma.collection.count({ where: { userId } });
    if (count >= MAX_COLLECTIONS_PER_USER) {
      return badRequest(res, `Vous ne pouvez pas créer plus de ${MAX_COLLECTIONS_PER_USER} collections`);
    }

    const collection = await prisma.collection.create({
      data: { name, description, isPublic, userId },
    });

    res.status(201).json(collection);
  } catch (err) {
    next(err);
  }
};

// GET /collections/me
// Accepte un paramètre optionnel ?recipeId=X pour indiquer si chaque collection contient déjà la recette
const getMyCollections = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const recipeId = req.query.recipeId ? parseInt(req.query.recipeId) : null;

    const collections = await prisma.collection.findMany({
      where: { userId },
      include: {
        _count: { select: { recipes: true } },
        recipes: recipeId
          ? {
              // Quand recipeId est fourni, on inclut tous les ids pour vérifier la présence
              select: { recipeId: true },
            }
          : {
              take: 1,
              orderBy: { addedAt: 'desc' },
              include: {
                recipe: { select: { imageUrl: true } },
              },
            },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(collections.map(({ _count, recipes, ...c }) => {
      const base = {
        ...c,
        recipesCount: _count.recipes,
      };

      if (recipeId) {
        // Mode "check" : on retourne containsRecipe et pas previewImage
        return {
          ...base,
          containsRecipe: recipes.some((r) => r.recipeId === recipeId),
        };
      }

      // Mode normal : previewImage depuis la dernière recette ajoutée
      return {
        ...base,
        previewImage: recipes[0]?.recipe?.imageUrl || null,
      };
    }));
  } catch (err) {
    next(err);
  }
};

// GET /collections/:id
const getCollectionById = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return badRequest(res, 'id invalide');

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
                _count: { select: { ratings: true } },
              },
            },
          },
        },
      },
    });

    if (!collection) return notFound(res, 'Collection introuvable');

    // Collection privée : seul le propriétaire peut la voir
    if (!collection.isPublic && collection.userId !== req.user?.id) {
      return notFound(res, 'Collection introuvable');
    }

    // Calculer avgRating pour chaque recette (batch)
    const rawRecipes = collection.recipes.map(({ recipe }) => recipe);
    const recipes = await enrichRecipes(rawRecipes);

    const { recipes: _, ...collectionData } = collection;
    res.json({ ...collectionData, recipes });
  } catch (err) {
    next(err);
  }
};

// PUT /collections/:id
const updateCollection = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return badRequest(res, 'id invalide');

    const parsed = updateCollectionSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, formatZodError(parsed.error));
    }

    const { name, description, isPublic } = parsed.data;

    const collection = await prisma.collection.findUnique({ where: { id } });
    if (!collection) return notFound(res, 'Collection introuvable');
    if (collection.userId !== req.user.id) return forbidden(res);

    const updated = await prisma.collection.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isPublic !== undefined && { isPublic }),
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// DELETE /collections/:id
const deleteCollection = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return badRequest(res, 'id invalide');

    const collection = await prisma.collection.findUnique({ where: { id } });
    if (!collection) return notFound(res, 'Collection introuvable');
    if (collection.userId !== req.user.id) return forbidden(res);

    await prisma.collection.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// POST /collections/:id/recipes
const addRecipeToCollection = async (req, res, next) => {
  try {
    const collectionId = parseId(req.params.id);
    if (!collectionId) return badRequest(res, 'id invalide');

    const recipeId = parseId(req.body.recipeId);
    if (!recipeId) return badRequest(res, 'recipeId invalide');

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: { _count: { select: { recipes: true } } },
    });
    if (!collection) return notFound(res, 'Collection introuvable');
    if (collection.userId !== req.user.id) return forbidden(res);

    if (collection._count.recipes >= MAX_RECIPES_PER_COLLECTION) {
      return badRequest(res, `Une collection ne peut pas contenir plus de ${MAX_RECIPES_PER_COLLECTION} recettes`);
    }

    // Vérifier que la recette existe
    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) return notFound(res, 'Recette introuvable');

    await prisma.collectionRecipe.create({
      data: { collectionId, recipeId },
    });
    res.status(201).json({ added: true });
  } catch (err) {
    if (err.code === 'P2002') {
      return conflict(res, 'Cette recette est déjà dans la collection');
    }
    next(err);
  }
};

// DELETE /collections/:id/recipes/:recipeId
const removeRecipeFromCollection = async (req, res, next) => {
  try {
    const collectionId = parseId(req.params.id);
    if (!collectionId) return badRequest(res, 'id invalide');

    const recipeId = parseId(req.params.recipeId);
    if (!recipeId) return badRequest(res, 'recipeId invalide');

    const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
    if (!collection) return notFound(res, 'Collection introuvable');
    if (collection.userId !== req.user.id) return forbidden(res);

    await prisma.collectionRecipe.delete({
      where: { collectionId_recipeId: { collectionId, recipeId } },
    });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') {
      return notFound(res, 'Recette non trouvée dans cette collection');
    }
    next(err);
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
