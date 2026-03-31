const prisma = require('../prisma');
const { parseId, badRequest, notFound } = require('../helpers');

// GET /recipes/:id/history — liste des révisions
const getRecipeHistory = async (req, res, next) => {
  try {
    const recipeId = parseId(req.params.id);
    if (!recipeId) return badRequest(res, 'id invalide');

    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId }, select: { id: true } });
    if (!recipe) return notFound(res, 'Recette introuvable');

    const revisions = await prisma.recipeRevision.findMany({
      where: { recipeId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        authorId: true,
        message: true,
        createdAt: true,
      },
    });

    // Enrichir avec les pseudos des auteurs
    const authorIds = [...new Set(revisions.map((r) => r.authorId))];
    const authors = await prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, pseudo: true },
    });
    const authorMap = Object.fromEntries(authors.map((a) => [a.id, a.pseudo]));

    const enriched = revisions.map((r) => ({
      ...r,
      authorPseudo: authorMap[r.authorId] || null,
    }));

    res.json({ recipeId, revisions: enriched, count: enriched.length });
  } catch (err) {
    next(err);
  }
};

// GET /recipes/:id/revisions/:version — contenu d'une révision
const getRevision = async (req, res, next) => {
  try {
    const recipeId = parseId(req.params.id);
    const version = parseInt(req.params.version);
    if (!recipeId || isNaN(version)) return badRequest(res, 'Paramètres invalides');

    const revision = await prisma.recipeRevision.findUnique({
      where: { recipeId_version: { recipeId, version } },
    });

    if (!revision) return notFound(res, 'Révision introuvable');

    res.json(revision);
  } catch (err) {
    next(err);
  }
};

module.exports = { getRecipeHistory, getRevision };
