const prisma = require('../prisma');
const { preferencesSchema, formatZodError } = require('../schemas');
const { badRequest } = require('../helpers');

// GET /users/me/preferences — récupère les préférences de l'utilisateur connecté
const getMyPreferences = async (req, res, next) => {
  const userId = req.user.id;
  try {
    const prefs = await prisma.userPreference.findUnique({ where: { userId } });
    // Retourne les valeurs par défaut si aucune préférence n'existe encore
    if (!prefs) {
      return res.json({
        sweetness: 3,
        bitterness: 3,
        sourness: 3,
        strength: 3,
        excludedIngredients: [],
      });
    }
    res.json(prefs);
  } catch (err) {
    next(err);
  }
};

// PUT /users/me/preferences — crée ou met à jour les préférences de l'utilisateur connecté
const upsertMyPreferences = async (req, res, next) => {
  const userId = req.user.id;

  const parsed = preferencesSchema.safeParse(req.body);
  if (!parsed.success) {
    return badRequest(res, formatZodError(parsed.error));
  }

  const { sweetness, bitterness, sourness, strength, excludedIngredients } = parsed.data;

  try {
    // Récupère les préférences existantes pour construire les données de mise à jour
    const existing = await prisma.userPreference.findUnique({ where: { userId } });

    const data = {
      sweetness:           sweetness           ?? existing?.sweetness           ?? 3,
      bitterness:          bitterness          ?? existing?.bitterness          ?? 3,
      sourness:            sourness            ?? existing?.sourness            ?? 3,
      strength:            strength            ?? existing?.strength            ?? 3,
      excludedIngredients: excludedIngredients ?? existing?.excludedIngredients ?? [],
    };

    const prefs = await prisma.userPreference.upsert({
      where:  { userId },
      create: { userId, ...data },
      update: data,
    });

    res.json(prefs);
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyPreferences, upsertMyPreferences };
