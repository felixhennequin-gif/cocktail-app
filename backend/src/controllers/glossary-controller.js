const prisma = require('../prisma');
const { parseId, badRequest, notFound } = require('../helpers');
const { createGlossaryEntrySchema, formatZodError } = require('../schemas');

// GET /glossary?category=technique&q=shaker&page=1&limit=20
const getGlossary = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const category = req.query.category;
    const q = req.query.q;

    const where = {};
    if (category) where.category = category;
    if (q) {
      where.OR = [
        { term: { contains: q, mode: 'insensitive' } },
        { definition: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [entries, total] = await Promise.all([
      prisma.glossaryEntry.findMany({
        where,
        orderBy: { term: 'asc' },
        skip,
        take: limit,
        select: { id: true, term: true, slug: true, definition: true, category: true },
      }),
      prisma.glossaryEntry.count({ where }),
    ]);

    res.json({ data: entries, total, page, limit });
  } catch (err) {
    next(err);
  }
};

// GET /glossary/:slug — entrée complète avec recettes liées
const getGlossaryEntry = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const entry = await prisma.glossaryEntry.findUnique({ where: { slug } });
    if (!entry) return notFound(res, 'Terme introuvable');

    // Charger les recettes liées
    let relatedRecipes = [];
    if (entry.relatedRecipeIds?.length > 0) {
      relatedRecipes = await prisma.recipe.findMany({
        where: { id: { in: entry.relatedRecipeIds }, status: 'PUBLISHED' },
        select: { id: true, name: true, imageUrl: true, difficulty: true, prepTime: true },
        take: 6,
      });
    }

    // Charger les termes connexes
    let relatedEntries = [];
    if (entry.relatedEntryIds?.length > 0) {
      relatedEntries = await prisma.glossaryEntry.findMany({
        where: { id: { in: entry.relatedEntryIds } },
        select: { id: true, term: true, slug: true, definition: true },
      });
    }

    res.json({ ...entry, relatedRecipes, relatedEntries });
  } catch (err) {
    next(err);
  }
};

// POST /glossary [admin] — créer une entrée
const createGlossaryEntry = async (req, res, next) => {
  try {
    const parsed = createGlossaryEntrySchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, formatZodError(parsed.error));
    const { term, definition, longDescription, category, relatedRecipeIds, relatedEntryIds } = parsed.data;

    const slug = term.toLowerCase().replace(/[^a-z0-9àâäéèêëïîôùûüÿçœæ]+/g, '-').replace(/(^-|-$)/g, '');

    const entry = await prisma.glossaryEntry.create({
      data: {
        term: term.trim(),
        slug,
        definition: definition.trim(),
        longDescription: longDescription || null,
        category,
        relatedRecipeIds,
        relatedEntryIds,
      },
    });

    res.status(201).json(entry);
  } catch (err) {
    if (err.code === 'P2002') return badRequest(res, 'Ce terme existe déjà');
    next(err);
  }
};

module.exports = { getGlossary, getGlossaryEntry, createGlossaryEntry };
