const prisma = require('../prisma');
const { slugify } = require('../utils/slugify');

// GET /categories
const getAllCategories = async (req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { recipes: { where: { status: 'PUBLISHED' } } } },
    },
  });
  res.json(categories.map(({ _count, ...cat }) => ({
    ...cat,
    recipesCount: _count.recipes,
  })));
};

// GET /categories/:slug — détail catégorie avec recettes populaires et tags associés
const getCategoryBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const category = await prisma.category.findUnique({
      where: { slug },
    });

    if (!category) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    // Compter les recettes publiées dans cette catégorie
    const recipesCount = await prisma.recipe.count({
      where: { categoryId: category.id, status: 'PUBLISHED' },
    });

    // Tags populaires associés aux recettes de cette catégorie
    const popularTags = await prisma.$queryRaw`
      SELECT t.id, t.name, COUNT(*)::int AS "recipesCount"
      FROM "Tag" t
      JOIN "RecipeTag" rt ON rt."tagId" = t.id
      JOIN "Recipe" r ON r.id = rt."recipeId"
      WHERE r."categoryId" = ${category.id} AND r.status = 'PUBLISHED'
      GROUP BY t.id, t.name
      ORDER BY COUNT(*) DESC
      LIMIT 10
    `;

    res.json({
      ...category,
      recipesCount,
      popularTags,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllCategories, getCategoryBySlug };
