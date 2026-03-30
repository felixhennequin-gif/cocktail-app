const prisma = require('../prisma');
const { badRequest, notFound } = require('../helpers');
const { createTechniqueSchema, updateTechniqueSchema, formatZodError } = require('../schemas');

/**
 * Génère un slug à partir d'un nom :
 * - minuscules
 * - espaces → tirets
 * - supprime les caractères spéciaux (accents, ponctuation…)
 */
const generateSlug = (name) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprime les diacritiques
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

// GET /techniques — liste toutes les techniques (ordre alphabétique)
const getTechniques = async (req, res, next) => {
  try {
    const techniques = await prisma.technique.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(techniques);
  } catch (err) {
    next(err);
  }
};

// GET /techniques/:slug — détail d'une technique par son slug
const getTechniqueBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const technique = await prisma.technique.findUnique({
      where: { slug },
    });

    if (!technique) return notFound(res, 'Technique introuvable');
    res.json(technique);
  } catch (err) {
    next(err);
  }
};

// POST /techniques — créer une technique (admin)
const createTechnique = async (req, res, next) => {
  try {
    const parsed = createTechniqueSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, formatZodError(parsed.error));
    }

    const { name, description, videoUrl, iconUrl } = parsed.data;
    const slug = generateSlug(name);

    // Vérifier l'unicité du nom et du slug
    const existing = await prisma.technique.findFirst({
      where: { OR: [{ name }, { slug }] },
    });
    if (existing) {
      return badRequest(res, 'Une technique avec ce nom existe déjà');
    }

    const technique = await prisma.technique.create({
      data: { name, slug, description, videoUrl: videoUrl ?? null, iconUrl: iconUrl ?? null },
    });

    res.status(201).json(technique);
  } catch (err) {
    next(err);
  }
};

// PUT /techniques/:slug — modifier une technique (admin)
const updateTechnique = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const existing = await prisma.technique.findUnique({ where: { slug } });
    if (!existing) return notFound(res, 'Technique introuvable');

    const parsed = updateTechniqueSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, formatZodError(parsed.error));
    }

    const data = {};

    if (parsed.data.name !== undefined) {
      data.name = parsed.data.name;
      data.slug = generateSlug(parsed.data.name);

      // Vérifier qu'aucune autre technique ne porte ce nom/slug
      const conflict = await prisma.technique.findFirst({
        where: {
          OR: [{ name: data.name }, { slug: data.slug }],
          NOT: { id: existing.id },
        },
      });
      if (conflict) {
        return badRequest(res, 'Une technique avec ce nom existe déjà');
      }
    }

    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.videoUrl !== undefined) data.videoUrl = parsed.data.videoUrl ?? null;
    if (parsed.data.iconUrl !== undefined)  data.iconUrl  = parsed.data.iconUrl  ?? null;

    const technique = await prisma.technique.update({
      where: { id: existing.id },
      data,
    });

    res.json(technique);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTechniques,
  getTechniqueBySlug,
  createTechnique,
  updateTechnique,
};
