const prisma = require('../prisma');

// GET /users/:id — profil public
const getUserProfile = async (req, res) => {
  const id = parseInt(req.params.id);

  const user = await prisma.user.findUnique({
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
  });

  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const recipes = user.recipes.map(({ ratings, ...rest }) => {
    const avgRating =
      ratings.length > 0
        ? Math.round((ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length) * 10) / 10
        : null;
    return { ...rest, avgRating, ratingsCount: ratings.length };
  });

  res.json({ ...user, recipes });
};

module.exports = { getUserProfile };
