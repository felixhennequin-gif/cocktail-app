const prisma = require('../prisma');
const { parseId } = require('../helpers');

const MAX_BIO_LENGTH = 500;

// PUT /users/me — met à jour le profil de l'utilisateur connecté
const updateMyProfile = async (req, res) => {
  const userId = req.user.id;
  const { pseudo, bio, avatar } = req.body;

  // Validation basique
  if (pseudo !== undefined && (!pseudo || pseudo.trim().length < 2)) {
    return res.status(400).json({ error: 'Le pseudo doit faire au moins 2 caractères' });
  }
  if (bio !== undefined && bio && bio.trim().length > MAX_BIO_LENGTH) {
    return res.status(400).json({ error: `La bio ne doit pas dépasser ${MAX_BIO_LENGTH} caractères` });
  }

  try {
    const data = {};
    if (pseudo  !== undefined) data.pseudo  = pseudo.trim();
    if (bio     !== undefined) data.bio     = bio?.trim() || null;
    if (avatar  !== undefined) data.avatar  = avatar || null;

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, pseudo: true, email: true, avatar: true, bio: true, role: true, createdAt: true },
    });

    res.json(user);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ce pseudo est déjà utilisé' });
    }
    throw err;
  }
};

// GET /users/:id — profil public (optionalAuth pour isFollowing)
const getUserProfile = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'id invalide' });

  const currentUserId = req.user?.id ?? null;

  const [user, followersCount, followingCount, followRow] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        pseudo: true,
        avatar: true,
        createdAt: true,
        recipes: {
          where: { status: 'PUBLISHED' },
          include: {
            category: true,
            ratings: { select: { score: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    }),
    prisma.follow.count({ where: { followingId: id } }),
    prisma.follow.count({ where: { followerId:  id } }),
    currentUserId
      ? prisma.follow.findFirst({ where: { followerId: currentUserId, followingId: id } })
      : null,
  ]);

  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const recipes = user.recipes.map(({ ratings, ...rest }) => {
    const avgRating =
      ratings.length > 0
        ? Math.round((ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length) * 10) / 10
        : null;
    return { ...rest, avgRating, ratingsCount: ratings.length };
  });

  res.json({ ...user, recipes, followersCount, followingCount, isFollowing: !!followRow });
};

// GET /users/:id/recipes?page=1&limit=20
const getUserRecipes = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'id invalide' });

  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, pseudo: true, avatar: true },
  });
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const where = { authorId: id, status: 'PUBLISHED' };
  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      include: {
        category: true,
        ratings: { select: { score: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.recipe.count({ where }),
  ]);

  const data = recipes.map(({ ratings, ...rest }) => {
    const avgRating =
      ratings.length > 0
        ? Math.round((ratings.reduce((s, r) => s + r.score, 0) / ratings.length) * 10) / 10
        : null;
    return { ...rest, avgRating, ratingsCount: ratings.length };
  });

  res.json({ user, recipes: { data, total, page, limit } });
};

module.exports = { updateMyProfile, getUserProfile, getUserRecipes };
