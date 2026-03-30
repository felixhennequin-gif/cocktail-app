const prisma = require('../prisma');
const { badRequest } = require('../helpers');
const { enrichRecipes, includeList } = require('../helpers/recipe-helpers');

// GET /bar — ingrédients du bar de l'utilisateur connecté
const getMyBar = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const items = await prisma.userIngredient.findMany({
      where: { userId },
      include: { ingredient: true },
    });
    res.json(items.map((i) => ({ id: i.ingredient.id, name: i.ingredient.name })));
  } catch (err) {
    next(err);
  }
};

// PUT /bar — remplace le bar de l'utilisateur (transaction)
const updateMyBar = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { ingredientIds } = req.body;

    if (!Array.isArray(ingredientIds)) {
      return badRequest(res, 'ingredientIds doit être un tableau');
    }
    // Dédupliquer et valider les IDs
    const uniqueIds = [...new Set(ingredientIds.map((id) => parseInt(id)).filter(Number.isFinite))];
    if (uniqueIds.length === 0 && ingredientIds.length > 0) {
      return badRequest(res, 'Aucun ID valide fourni');
    }
    // Limite raisonnable
    if (uniqueIds.length > 200) {
      return badRequest(res, 'Maximum 200 ingrédients autorisés');
    }

    // Vérifier que les ingrédients existent
    const existing = await prisma.ingredient.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    const existingIds = existing.map((i) => i.id);

    await prisma.$transaction([
      prisma.userIngredient.deleteMany({ where: { userId } }),
      ...existingIds.map((ingredientId) =>
        prisma.userIngredient.create({ data: { userId, ingredientId } })
      ),
    ]);

    // Retourner le bar mis à jour
    const items = await prisma.userIngredient.findMany({
      where: { userId },
      include: { ingredient: true },
    });
    res.json(items.map((i) => ({ id: i.ingredient.id, name: i.ingredient.name })));
  } catch (err) {
    next(err);
  }
};

// GET /bar/makeable — recettes réalisables avec le bar de l'utilisateur
const getMakeableRecipes = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Récupérer les ingrédients du bar
    const barItems = await prisma.userIngredient.findMany({
      where: { userId },
      select: { ingredientId: true },
    });
    const barIds = new Set(barItems.map((i) => i.ingredientId));

    if (barIds.size === 0) {
      return res.json({ makeable: [], almostMakeable: [] });
    }

    // Récupérer toutes les recettes publiées avec leurs ingrédients
    const recipes = await prisma.recipe.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        ...includeList,
        ingredients: {
          include: { ingredient: true },
        },
      },
    });

    const makeable = [];
    const almostMakeable = [];

    for (const recipe of recipes) {
      const recipeIngredientIds = recipe.ingredients.map((ri) => ri.ingredientId);
      if (recipeIngredientIds.length === 0) continue;

      const missing = recipeIngredientIds.filter((id) => !barIds.has(id));
      const matchPercent = ((recipeIngredientIds.length - missing.length) / recipeIngredientIds.length) * 100;

      if (missing.length === 0) {
        makeable.push(recipe);
      } else if (missing.length <= 2) {
        const missingNames = recipe.ingredients
          .filter((ri) => missing.includes(ri.ingredientId))
          .map((ri) => ri.ingredient.name);
        almostMakeable.push({
          recipe,
          missingCount: missing.length,
          missingIngredients: missingNames,
          matchPercent: Math.round(matchPercent),
        });
      }
    }

    // Trier les « presque réalisables » par % de correspondance décroissant
    almostMakeable.sort((a, b) => b.matchPercent - a.matchPercent);

    // Enrichir avec avgRating etc.
    const enrichedMakeable = await enrichRecipes(makeable);
    const enrichedAlmost = await Promise.all(
      almostMakeable.map(async (item) => ({
        ...item,
        recipe: (await enrichRecipes([item.recipe]))[0],
      }))
    );

    res.json({ makeable: enrichedMakeable, almostMakeable: enrichedAlmost });
  } catch (err) {
    next(err);
  }
};

// GET /bar/ingredients — recherche d'ingrédients (pour l'autocomplete)
const searchIngredients = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const where = q
      ? { name: { contains: q, mode: 'insensitive' } }
      : {};
    const ingredients = await prisma.ingredient.findMany({
      where,
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 50,
    });
    res.json(ingredients);
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyBar, updateMyBar, getMakeableRecipes, searchIngredients };
