const prisma = require('../prisma');
const { notFound } = require('../helpers');

// GET /collections/curated — liste des collections curées
const getCuratedCollections = async (req, res, next) => {
  try {
    const collections = await prisma.collection.findMany({
      where: { isCurated: true, isPublic: true },
      include: {
        recipes: {
          take: 4,
          include: {
            recipe: {
              select: { id: true, name: true, imageUrl: true, difficulty: true, prepTime: true },
            },
          },
          orderBy: { addedAt: 'desc' },
        },
        _count: { select: { recipes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = collections.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      curatorName: c.curatorName,
      curatorBio: c.curatorBio,
      curatorAvatar: c.curatorAvatar,
      recipesCount: c._count.recipes,
      preview: c.recipes.map((cr) => cr.recipe),
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// GET /collections/curated/:id — détail d'une collection curée
// Les users free voient les 3 premières recettes, les premium voient tout
const getCuratedCollectionDetail = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'id invalide' });

    const collection = await prisma.collection.findUnique({
      where: { id, isCurated: true },
      include: {
        recipes: {
          include: {
            recipe: {
              select: {
                id: true, name: true, imageUrl: true, difficulty: true,
                prepTime: true, description: true,
                category: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { addedAt: 'asc' },
        },
        _count: { select: { recipes: true } },
      },
    });

    if (!collection) return notFound(res, 'Collection introuvable');

    const isPremium = req.user?.plan === 'PREMIUM' || req.user?.role === 'ADMIN';
    const allRecipes = collection.recipes.map((cr) => cr.recipe);
    const visibleRecipes = isPremium ? allRecipes : allRecipes.slice(0, 3);
    const lockedCount = isPremium ? 0 : Math.max(0, allRecipes.length - 3);

    res.json({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      curatorName: collection.curatorName,
      curatorBio: collection.curatorBio,
      curatorAvatar: collection.curatorAvatar,
      recipesCount: collection._count.recipes,
      recipes: visibleRecipes,
      lockedCount,
      isPremiumRequired: lockedCount > 0,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCuratedCollections, getCuratedCollectionDetail };
