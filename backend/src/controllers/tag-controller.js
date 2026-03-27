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

module.exports = { getAllTags, resolveTagNames, normalizeTagName };
