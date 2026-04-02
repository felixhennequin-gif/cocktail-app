const prisma = require('../prisma');
const { parseId, badRequest, notFound, conflict } = require('../helpers');
const { updateProfileSchema, updateUserPlanSchema, formatZodError } = require('../schemas');
const { enrichRecipes } = require('../helpers/recipe-helpers');

// PUT /users/me — met à jour le profil de l'utilisateur connecté
const updateMyProfile = async (req, res, next) => {
  const userId = req.user.id;

  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return badRequest(res, formatZodError(parsed.error));
  }

  const { pseudo, bio, avatar } = parsed.data;

  try {
    const data = {};
    if (pseudo  !== undefined) data.pseudo  = pseudo;
    if (bio     !== undefined) data.bio     = bio;
    if (avatar  !== undefined) data.avatar  = avatar || null;

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, pseudo: true, email: true, avatar: true, bio: true, role: true, plan: true, createdAt: true },
    });

    res.json(user);
  } catch (err) {
    if (err.code === 'P2002') {
      return conflict(res, 'Ce pseudo est déjà utilisé');
    }
    next(err);
  }
};

// GET /users/:id — profil public (optionalAuth pour isFollowing)
const getUserProfile = async (req, res, next) => {
  try {
  const id = parseId(req.params.id);
  if (!id) return badRequest(res, 'id invalide');

  const currentUserId = req.user?.id ?? null;

  const [user, followersCount, followingCount, followRow] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        pseudo: true,
        avatar: true,
        bio: true,
        plan: true,
        createdAt: true,
        recipes: {
          where: { status: 'PUBLISHED' },
          include: {
            category: true,
            _count: { select: { ratings: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    }),
    prisma.follow.count({ where: { followingId: id } }),
    prisma.follow.count({ where: { followerId:  id } }),
    currentUserId
      ? prisma.follow.findFirst({ where: { followerId: currentUserId, followingId: id } })
      : null,
  ]);

  if (!user) return notFound(res, 'Utilisateur introuvable');

  const recipes = await enrichRecipes(user.recipes);

  res.json({ ...user, recipes, followersCount, followingCount, isFollowing: !!followRow });
  } catch (err) {
    next(err);
  }
};

// GET /users/:id/recipes?page=1&limit=20
const getUserRecipes = async (req, res, next) => {
  try {
  const id = parseId(req.params.id);
  if (!id) return badRequest(res, 'id invalide');

  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, pseudo: true, avatar: true },
  });
  if (!user) return notFound(res, 'Utilisateur introuvable');

  const where = { authorId: id, status: 'PUBLISHED' };
  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      include: {
        category: true,
        _count: { select: { ratings: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.recipe.count({ where }),
  ]);

  const data = await enrichRecipes(recipes);

  res.json({ user, recipes: { data, total, page, limit } });
  } catch (err) {
    next(err);
  }
};

// PATCH /admin/users/:id/plan — met à jour le plan d'un utilisateur (admin uniquement)
const updateUserPlan = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return badRequest(res, 'id invalide');

    const parsed = updateUserPlanSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, formatZodError(parsed.error));
    }

    const { plan } = parsed.data;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return notFound(res, 'Utilisateur introuvable');

    const updated = await prisma.user.update({
      where: { id },
      data: { plan },
      select: { id: true, pseudo: true, email: true, role: true, plan: true },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// GET /users/:id/stats — statistiques agrégées du profil public
const getUserStats = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return badRequest(res, 'id invalide');

    const exists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return notFound(res, 'Utilisateur introuvable');

    const [
      recipesCount,
      totalFavoritesReceived,
      avgRatingRaw,
      followersCount,
      followingCount,
      commentsCount,
      badgesCount,
      collectionsCount,
    ] = await Promise.all([
      prisma.recipe.count({ where: { authorId: id, status: 'PUBLISHED' } }),
      prisma.favorite.count({ where: { recipe: { authorId: id } } }),
      prisma.$queryRaw`
        SELECT AVG(r.score)::float AS avg
        FROM "Rating" r
        INNER JOIN "Recipe" rec ON rec.id = r."recipeId"
        WHERE rec."authorId" = ${id}
      `,
      prisma.follow.count({ where: { followingId: id } }),
      prisma.follow.count({ where: { followerId: id } }),
      prisma.comment.count({ where: { userId: id } }),
      prisma.userBadge.count({ where: { userId: id } }),
      prisma.collection.count({ where: { userId: id, isPublic: true } }),
    ]);

    const averageRating = avgRatingRaw[0]?.avg ?? null;

    res.json({
      recipesCount,
      totalFavoritesReceived,
      averageRating: averageRating !== null ? parseFloat(averageRating.toFixed(2)) : null,
      followersCount,
      followingCount,
      commentsCount,
      badgesCount,
      collectionsCount,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { updateMyProfile, getUserProfile, getUserRecipes, updateUserPlan, getUserStats };
