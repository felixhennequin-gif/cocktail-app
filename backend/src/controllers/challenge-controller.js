const prisma = require('../prisma');
const { parseId, badRequest, notFound, forbidden } = require('../helpers');
const { createChallengeSchema, formatZodError } = require('../schemas');
const { enrichRecipes } = require('../helpers/recipe-helpers');

// GET /challenges — liste des défis actifs
const getChallenges = async (req, res, next) => {
  try {
    const challenges = await prisma.challenge.findMany({
      where: { active: true },
      orderBy: { startDate: 'desc' },
      include: {
        tag: { select: { id: true, name: true } },
        _count: { select: { entries: true } },
      },
    });

    res.json(challenges);
  } catch (err) {
    next(err);
  }
};

// GET /challenges/current — défi de la semaine en cours
const getCurrentChallenge = async (req, res, next) => {
  try {
    const now = new Date();
    const challenge = await prisma.challenge.findFirst({
      where: {
        active: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { startDate: 'desc' },
      include: {
        tag: { select: { id: true, name: true } },
        _count: { select: { entries: true } },
      },
    });

    if (!challenge) return res.json(null);
    res.json(challenge);
  } catch (err) {
    next(err);
  }
};

// GET /challenges/:id — détail avec les recettes participantes
const getChallengeById = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return badRequest(res, 'id invalide');

    const challenge = await prisma.challenge.findUnique({
      where: { id },
      include: {
        tag: { select: { id: true, name: true } },
        entries: {
          include: {
            recipe: {
              include: {
                category: true,
                author: { select: { id: true, pseudo: true, avatar: true } },
                ratings: true,
                tags: { include: { tag: true } },
                _count: { select: { favorites: true } },
              },
            },
            user: { select: { id: true, pseudo: true, avatar: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!challenge) return notFound(res, 'Défi introuvable');

    // Enrichir les recettes avec avgRating
    const recipes = challenge.entries.map((e) => e.recipe);
    const enriched = await enrichRecipes(recipes);

    // Reconstruire la réponse avec les recettes enrichies
    const result = {
      ...challenge,
      entries: challenge.entries.map((entry, i) => ({
        id: entry.id,
        createdAt: entry.createdAt,
        user: entry.user,
        recipe: enriched[i],
      })),
    };

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// POST /challenges/:id/enter — soumettre une recette à un défi
const enterChallenge = async (req, res, next) => {
  try {
    const challengeId = parseId(req.params.id);
    if (!challengeId) return badRequest(res, 'id invalide');

    const { recipeId } = req.body;
    if (!recipeId || !Number.isInteger(recipeId) || recipeId < 1) {
      return badRequest(res, 'recipeId est requis et doit être un entier positif');
    }

    // Vérifier que le défi existe et est en cours
    const now = new Date();
    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) return notFound(res, 'Défi introuvable');
    if (!challenge.active || challenge.startDate > now || challenge.endDate < now) {
      return badRequest(res, 'Ce défi n\'est pas en cours');
    }

    // Vérifier que la recette existe, est publiée et appartient à l'utilisateur
    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) return notFound(res, 'Recette introuvable');
    if (recipe.status !== 'PUBLISHED') {
      return badRequest(res, 'La recette doit être publiée pour participer');
    }
    if (recipe.authorId !== req.user.id) {
      return forbidden(res, 'Vous ne pouvez soumettre que vos propres recettes');
    }

    // Vérifier que la recette n'est pas déjà inscrite
    const existing = await prisma.challengeEntry.findUnique({
      where: { challengeId_recipeId: { challengeId, recipeId } },
    });
    if (existing) {
      return badRequest(res, 'Cette recette participe déjà à ce défi');
    }

    const entry = await prisma.challengeEntry.create({
      data: {
        challengeId,
        recipeId,
        userId: req.user.id,
      },
      include: {
        recipe: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
};

// POST /challenges — créer un défi (admin)
const createChallenge = async (req, res, next) => {
  try {
    const parsed = createChallengeSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, formatZodError(parsed.error));
    }

    const { title, description, startDate, endDate, tagId } = parsed.data;

    // Vérifier que le tag existe s'il est fourni
    if (tagId) {
      const tag = await prisma.tag.findUnique({ where: { id: tagId } });
      if (!tag) return notFound(res, 'Tag introuvable');
    }

    const challenge = await prisma.challenge.create({
      data: { title, description, startDate: new Date(startDate), endDate: new Date(endDate), tagId },
      include: {
        tag: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(challenge);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getChallenges,
  getCurrentChallenge,
  getChallengeById,
  enterChallenge,
  createChallenge,
};
