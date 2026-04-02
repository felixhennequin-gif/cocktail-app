// Contrôleur ingrédients — liste publique + mise à jour du lien affilié (admin)
const prisma = require('../prisma');
const { updateIngredientSchema, formatZodError } = require('../schemas');

/**
 * GET /ingredients
 * Retourne tous les ingrédients triés par nom (utilisé par la barre virtuelle, l'admin et la liste publique).
 */
const getAllIngredients = async (req, res, next) => {
  try {
    const ingredients = await prisma.ingredient.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, affiliateUrl: true, estimatedPricePerUnit: true, unitSize: true },
    });
    res.json(ingredients);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /ingredients/:id
 * Permet à un administrateur de mettre à jour le lien affilié d'un ingrédient.
 * Corps attendu : { affiliateUrl: string | null }
 */
const updateIngredient = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'id invalide' });

    // Validation Zod
    const parsed = updateIngredientSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const { affiliateUrl, estimatedPricePerUnit, unitSize } = parsed.data;

    // Vérification existence
    const existing = await prisma.ingredient.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Ingrédient introuvable' });

    const data = { affiliateUrl: affiliateUrl ?? null };
    if (estimatedPricePerUnit !== undefined) data.estimatedPricePerUnit = estimatedPricePerUnit;
    if (unitSize !== undefined) data.unitSize = unitSize;

    const updated = await prisma.ingredient.update({
      where: { id },
      data,
      select: { id: true, name: true, affiliateUrl: true, estimatedPricePerUnit: true, unitSize: true },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllIngredients, updateIngredient };
