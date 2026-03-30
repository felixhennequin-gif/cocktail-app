const prisma = require('../prisma');
const { parseId, badRequest, notFound, conflict } = require('../helpers');
const { updateProfileSchema, formatZodError } = require('../schemas');
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
      select: { id: true, pseudo: true, email: true, avatar: true, bio: true, role: true, createdAt: true },
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

module.exports = { updateMyProfile, getUserProfile, getUserRecipes };
