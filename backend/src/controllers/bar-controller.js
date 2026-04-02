const { Prisma } = require('@prisma/client');
const prisma = require('../prisma');
const { badRequest } = require('../helpers');
const { enrichRecipes, includeList } = require('../helpers/recipe-helpers');
const { updateBarSchema, formatZodError } = require('../schemas');

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

    const parsed = updateBarSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, formatZodError(parsed.error));
    const { ingredientIds } = parsed.data;
    const uniqueIds = [...new Set(ingredientIds)];

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

    const barItems = await prisma.userIngredient.findMany({
      where: { userId },
      select: { ingredientId: true },
    });
    const barIds = barItems.map((i) => i.ingredientId);

    if (barIds.length === 0) {
      return res.json({ makeable: [], almostMakeable: [] });
    }

    // Recettes 100% faisables via SQL
    const makeableRows = await prisma.$queryRaw`
      SELECT r.id
      FROM "Recipe" r
      WHERE r.status = 'PUBLISHED'
        AND NOT EXISTS (
          SELECT 1 FROM "RecipeIngredient" ri
          WHERE ri."recipeId" = r.id
            AND ri."ingredientId" NOT IN (${Prisma.join(barIds)})
        )
        AND EXISTS (
          SELECT 1 FROM "RecipeIngredient" ri WHERE ri."recipeId" = r.id
        )
    `;
    const makeableIds = makeableRows.map((r) => r.id);

    // Recettes à 1-2 ingrédients manquants via SQL
    const almostRows = await prisma.$queryRaw`
      SELECT r.id,
        COUNT(CASE WHEN ri."ingredientId" NOT IN (${Prisma.join(barIds)}) THEN 1 END)::int AS missing_count,
        COUNT(ri."ingredientId")::int AS total_count
      FROM "Recipe" r
      JOIN "RecipeIngredient" ri ON ri."recipeId" = r.id
      WHERE r.status = 'PUBLISHED'
        AND r.id NOT IN (${makeableIds.length > 0 ? Prisma.join(makeableIds) : Prisma.sql`-1`})
      GROUP BY r.id
      HAVING COUNT(CASE WHEN ri."ingredientId" NOT IN (${Prisma.join(barIds)}) THEN 1 END) BETWEEN 1 AND 2
      ORDER BY COUNT(CASE WHEN ri."ingredientId" NOT IN (${Prisma.join(barIds)}) THEN 1 END) ASC,
               COUNT(ri."ingredientId")::int DESC
      LIMIT 20
    `;
    const almostIds = almostRows.map((r) => r.id);

    // Charger les recettes complètes seulement pour les IDs trouvés
    const allIds = [...makeableIds, ...almostIds];
    const allRecipes = allIds.length > 0
      ? await prisma.recipe.findMany({
          where: { id: { in: allIds } },
          include: {
            ...includeList,
            ingredients: { include: { ingredient: true } },
          },
        })
      : [];

    const recipeMap = new Map(allRecipes.map((r) => [r.id, r]));
    const barIdSet = new Set(barIds);

    const makeableRecipes = makeableIds.map((id) => recipeMap.get(id)).filter(Boolean);
    const enrichedMakeable = await enrichRecipes(makeableRecipes);

    // Enrichir en batch (pas N+1)
    const almostRecipes = almostIds.map((id) => recipeMap.get(id)).filter(Boolean);
    const enrichedAlmostRecipes = await enrichRecipes(almostRecipes);
    const enrichedAlmost = almostRecipes.map((recipe, i) => {
      const recipeIngredientIds = recipe.ingredients.map((ri) => ri.ingredientId);
      const missing = recipeIngredientIds.filter((id) => !barIdSet.has(id));
      const missingNames = recipe.ingredients
        .filter((ri) => missing.includes(ri.ingredientId))
        .map((ri) => ri.ingredient.name);
      return {
        recipe: enrichedAlmostRecipes[i],
        missingCount: missing.length,
        missingIngredients: missingNames,
        matchPercent: Math.round(((recipeIngredientIds.length - missing.length) / recipeIngredientIds.length) * 100),
      };
    });

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
