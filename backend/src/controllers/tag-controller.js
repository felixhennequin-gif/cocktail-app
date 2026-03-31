const prisma = require('../prisma');

// Normalise un nom de tag : trim + lowercase
const normalizeTagName = (name) => name.trim().toLowerCase();

// GET /tags — tous les tags avec le nombre de recettes associées
const getAllTags = async (req, res, next) => {
  try {
    const tags = await prisma.tag.findMany({
      include: {
        _count: { select: { recipes: true } },
      },
      orderBy: {
        recipes: { _count: 'desc' },
      },
    });

    res.json(tags.map(({ _count, ...tag }) => ({
      ...tag,
      recipesCount: _count.recipes,
    })));
  } catch (err) {
    next(err);
  }
};

// Résout des tagNames en tagIds, crée les tags manquants (batch)
const resolveTagNames = async (tagNames) => {
  const normalized = tagNames.map(normalizeTagName).filter(Boolean);
  const unique = [...new Set(normalized)];
  if (unique.length === 0) return [];

  // Upsert tous les tags en parallèle
  const tags = await Promise.all(
    unique.map((name) =>
      prisma.tag.upsert({
        where: { name },
        create: { name },
        update: {},
      })
    )
  );
  return tags.map((t) => t.id);
};

// GET /tags/:name — détail tag avec nombre de recettes et catégories associées
const getTagByName = async (req, res, next) => {
  try {
    const name = normalizeTagName(req.params.name);

    const tag = await prisma.tag.findUnique({
      where: { name },
    });

    if (!tag) {
      return res.status(404).json({ error: 'Tag non trouvé' });
    }

    // Compter les recettes publiées avec ce tag
    const recipesCount = await prisma.recipeTag.count({
      where: {
        tagId: tag.id,
        recipe: { status: 'PUBLISHED' },
      },
    });

    // Catégories associées à ce tag (avec nombre de recettes)
    const relatedCategories = await prisma.$queryRaw`
      SELECT c.id, c.name, c.slug, COUNT(*)::int AS "recipesCount"
      FROM "Category" c
      JOIN "Recipe" r ON r."categoryId" = c.id
      JOIN "RecipeTag" rt ON rt."recipeId" = r.id
      WHERE rt."tagId" = ${tag.id} AND r.status = 'PUBLISHED'
      GROUP BY c.id, c.name, c.slug
      ORDER BY COUNT(*) DESC
    `;

    res.json({
      ...tag,
      recipesCount,
      relatedCategories,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllTags, getTagByName, resolveTagNames, normalizeTagName };
