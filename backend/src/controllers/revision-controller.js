const prisma = require('../prisma');
const { parseIdOrSlug, badRequest, notFound } = require('../helpers');

// GET /recipes/:id/history — liste des révisions
const getRecipeHistory = async (req, res, next) => {
  try {
    const parsed = parseIdOrSlug(req.params.id);
    if (!parsed) return badRequest(res, 'id invalide');
    const where = parsed.id ? { id: parsed.id } : { slug: parsed.slug };

    const recipe = await prisma.recipe.findUnique({ where, select: { id: true, status: true, authorId: true } });
    if (!recipe) return notFound(res, 'Recette introuvable');
    const recipeId = recipe.id;

    // Les révisions d'une recette non publiée ne sont accessibles qu'à l'auteur ou un admin
    if (recipe.status !== 'PUBLISHED') {
      const user = req.user;
      const isAuthor = user && recipe.authorId === user.id;
      const isAdmin = user && user.role === 'ADMIN';
      if (!isAuthor && !isAdmin) return notFound(res, 'Recette introuvable');
    }

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
    const parsed = parseIdOrSlug(req.params.id);
    const version = parseInt(req.params.version);
    if (!parsed || isNaN(version)) return badRequest(res, 'Paramètres invalides');
    const where = parsed.id ? { id: parsed.id } : { slug: parsed.slug };

    // Vérifier que la recette existe et contrôler l'accès si elle n'est pas publiée
    const recipe = await prisma.recipe.findUnique({ where, select: { id: true, status: true, authorId: true } });
    if (!recipe) return notFound(res, 'Révision introuvable');

    if (recipe.status !== 'PUBLISHED') {
      const user = req.user;
      const isAuthor = user && recipe.authorId === user.id;
      const isAdmin = user && user.role === 'ADMIN';
      if (!isAuthor && !isAdmin) return notFound(res, 'Révision introuvable');
    }

    const recipeId = recipe.id;
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
