const prisma = require('../prisma');
const { badRequest } = require('../helpers');
const { createShoppingListSchema, formatZodError } = require('../schemas');

// Familles d'unités convertibles (vers la plus petite unité de la famille)
const UNIT_CONVERSIONS = {
  ml: { family: 'volume', factor: 1 },
  cl: { family: 'volume', factor: 10 },
  dl: { family: 'volume', factor: 100 },
  l:  { family: 'volume', factor: 1000 },
  g:  { family: 'weight', factor: 1 },
  kg: { family: 'weight', factor: 1000 },
};

// Normalise une unité en minuscule sans accents
const normalizeUnit = (unit) => (unit || '').toLowerCase().trim();

// Convertit une quantité dans l'unité de base de sa famille
const toBaseUnit = (qty, unit) => {
  const conv = UNIT_CONVERSIONS[normalizeUnit(unit)];
  if (!conv) return null;
  return { value: qty * conv.factor, family: conv.family };
};

// Reconvertit depuis l'unité de base vers la plus lisible
const fromBaseUnit = (value, family) => {
  if (family === 'volume') {
    if (value >= 1000) return { qty: value / 1000, unit: 'l' };
    if (value >= 100) return { qty: value / 100, unit: 'dl' };
    if (value >= 10) return { qty: value / 10, unit: 'cl' };
    return { qty: value, unit: 'ml' };
  }
  if (family === 'weight') {
    if (value >= 1000) return { qty: value / 1000, unit: 'kg' };
    return { qty: value, unit: 'g' };
  }
  return { qty: value, unit: '' };
};

// POST /shopping-list — génère une liste de courses consolidée
const generateShoppingList = async (req, res, next) => {
  try {
    const parsed = createShoppingListSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, formatZodError(parsed.error));

    const { recipeIds, servingsMultiplier } = parsed.data;

    // Charger les recettes avec leurs ingrédients
    const recipes = await prisma.recipe.findMany({
      where: { id: { in: recipeIds }, status: 'PUBLISHED' },
      select: {
        id: true,
        name: true,
        servings: true,
        ingredients: {
          include: { ingredient: true },
        },
      },
    });

    if (recipes.length === 0) {
      return badRequest(res, 'Aucune recette publiée trouvée');
    }

    // Charger les ingrédients du bar virtuel de l'utilisateur
    const userBar = await prisma.userIngredient.findMany({
      where: { userId: req.user.id },
      select: { ingredientId: true },
    });
    const barIngredientIds = new Set(userBar.map((ui) => ui.ingredientId));

    // Consolider les ingrédients
    // Clé : ingredientId, valeur : { name, quantities: [{qty, unit, recipeId}], affiliateUrl }
    const consolidated = new Map();

    for (const recipe of recipes) {
      const multiplier = servingsMultiplier?.[String(recipe.id)] || 1;
      const baseServings = recipe.servings || 1;
      const factor = multiplier / baseServings;

      for (const ri of recipe.ingredients) {
        const key = ri.ingredientId;
        if (!consolidated.has(key)) {
          consolidated.set(key, {
            ingredientId: ri.ingredientId,
            name: ri.ingredient.name,
            affiliateUrl: ri.ingredient.affiliateUrl || null,
            inStock: barIngredientIds.has(ri.ingredientId),
            entries: [],
          });
        }
        consolidated.get(key).entries.push({
          quantity: ri.quantity * factor,
          unit: ri.unit,
          recipeId: recipe.id,
          recipeName: recipe.name,
        });
      }
    }

    // Fusionner les quantités par ingrédient
    const items = [];
    for (const [, item] of consolidated) {
      // Tenter de fusionner les entrées par unité convertible
      const grouped = new Map(); // family -> baseValue   |   rawUnit -> rawTotal

      for (const entry of item.entries) {
        const base = toBaseUnit(entry.quantity, entry.unit);
        if (base) {
          const existing = grouped.get(base.family) || { value: 0, family: base.family, convertible: true };
          existing.value += base.value;
          grouped.set(base.family, existing);
        } else {
          // Unités non convertibles — additionner par unité exacte
          const normUnit = normalizeUnit(entry.unit) || '_none';
          const existing = grouped.get(normUnit) || { value: 0, unit: entry.unit, convertible: false };
          existing.value += entry.quantity;
          grouped.set(normUnit, existing);
        }
      }

      const quantities = [];
      for (const [, group] of grouped) {
        if (group.convertible) {
          const { qty, unit } = fromBaseUnit(group.value, group.family);
          quantities.push({ quantity: Math.round(qty * 100) / 100, unit });
        } else {
          quantities.push({ quantity: Math.round(group.value * 100) / 100, unit: group.unit });
        }
      }

      items.push({
        ingredientId: item.ingredientId,
        name: item.name,
        quantities,
        inStock: item.inStock,
        affiliateUrl: item.affiliateUrl,
        recipes: item.entries.map((e) => ({ id: e.recipeId, name: e.recipeName })),
      });
    }

    // Trier : en stock en dernier, puis alphabétique
    items.sort((a, b) => {
      if (a.inStock !== b.inStock) return a.inStock ? 1 : -1;
      return a.name.localeCompare(b.name);
    });

    res.json({
      items,
      recipes: recipes.map((r) => ({ id: r.id, name: r.name })),
      totalItems: items.length,
      inStockCount: items.filter((i) => i.inStock).length,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { generateShoppingList };
