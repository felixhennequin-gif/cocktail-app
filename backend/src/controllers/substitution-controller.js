const prisma = require('../prisma');
const { parseId, badRequest, notFound } = require('../helpers');

// GET /ingredients/:id/substitutes — retourne les substituts d'un ingrédient
const getSubstitutes = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return badRequest(res, 'id invalide');

    const ingredient = await prisma.ingredient.findUnique({ where: { id } });
    if (!ingredient) return notFound(res, 'Ingrédient introuvable');

    // Cherche dans les deux directions (ingredientId → substituteId et vice versa)
    const [forwardSubs, reverseSubs] = await Promise.all([
      prisma.ingredientSubstitution.findMany({
        where: { ingredientId: id },
        include: { substitute: { select: { id: true, name: true } } },
      }),
      prisma.ingredientSubstitution.findMany({
        where: { substituteId: id },
        include: { ingredient: { select: { id: true, name: true } } },
      }),
    ]);

    const substitutes = [
      ...forwardSubs.map((s) => ({
        id: s.substitute.id,
        name: s.substitute.name,
        ratio: s.ratio,
        notes: s.notes,
      })),
      ...reverseSubs.map((s) => ({
        id: s.ingredient.id,
        name: s.ingredient.name,
        ratio: s.ratio ? 1 / s.ratio : 1,
        notes: s.notes,
      })),
    ];

    // Si l'utilisateur est connecté, marquer ceux qui sont dans son bar
    let userBarIds = new Set();
    if (req.user) {
      const bar = await prisma.userIngredient.findMany({
        where: { userId: req.user.id },
        select: { ingredientId: true },
      });
      userBarIds = new Set(bar.map((b) => b.ingredientId));
    }

    const result = substitutes.map((s) => ({
      ...s,
      inUserBar: userBarIds.has(s.id),
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = { getSubstitutes };
