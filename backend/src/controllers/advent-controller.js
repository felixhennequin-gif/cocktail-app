const crypto = require('crypto');
const prisma = require('../prisma');
const { includeDetail } = require('../helpers/recipe-helpers');
const { getCache, setCache } = require('../cache');
const { notFound, badRequest } = require('../helpers');

// GET /recipes/advent/:day — recette du calendrier de l'avent (jour 1-24)
const getAdventRecipe = async (req, res, next) => {
  try {
    const day = parseInt(req.params.day);
    if (!day || day < 1 || day > 24) return badRequest(res, 'Le jour doit être entre 1 et 24');

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-indexed

    // Disponible uniquement en décembre
    if (month !== 12) {
      return res.json({ available: false, message: 'Le calendrier de l\'avent est disponible en décembre !' });
    }

    // On ne peut pas ouvrir une case future
    const currentDay = now.getDate();
    if (day > currentDay) {
      return res.json({ available: false, locked: true, message: 'Cette case n\'est pas encore disponible' });
    }

    const cacheKey = `cocktail:advent:${year}:${day}`;
    let publicData = process.env.NODE_ENV === 'test' ? null : await getCache(cacheKey);

    if (!publicData) {
      // Sélection déterministe via SHA-256
      const count = await prisma.recipe.count({ where: { status: 'PUBLISHED' } });
      if (count === 0) return notFound(res, 'Aucune recette publiée');

      const hash = crypto.createHash('sha256').update(`advent-${year}-${day}`).digest();
      const index = hash.readUInt32BE(0) % count;

      const [recipe] = await prisma.recipe.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { id: 'asc' },
        skip: index,
        take: 1,
        include: includeDetail,
      });

      if (!recipe) return notFound(res, 'Recette introuvable');

      const ratingAgg = await prisma.rating.aggregate({
        where: { recipeId: recipe.id },
        _avg: { score: true },
        _count: { score: true },
      });

      const { tags: recipeTags, ratings, ...recipeRest } = recipe;
      const flatTags = recipeTags ? recipeTags.map((rt) => rt.tag) : [];
      const avgRating = ratingAgg._avg.score !== null
        ? Math.round(ratingAgg._avg.score * 10) / 10
        : null;

      publicData = { ...recipeRest, tags: flatTags, avgRating, ratingsCount: ratingAgg._count.score };

      // Cache pour 24h (la recette ne change pas dans la journée)
      setCache(cacheKey, publicData, 86400).catch(() => {});
    }

    res.json({ available: true, day, recipe: publicData });
  } catch (err) {
    next(err);
  }
};

// GET /recipes/advent — résumé du calendrier (quelles cases sont ouvertes)
const getAdventSummary = async (req, res, next) => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;

    if (month !== 12) {
      return res.json({ available: false, message: 'Le calendrier de l\'avent est disponible en décembre !' });
    }

    const currentDay = now.getDate();
    const year = now.getFullYear();
    const maxDay = Math.min(currentDay, 24);

    // Cache du résumé complet
    const summaryCacheKey = `cocktail:advent:summary:${year}:${maxDay}`;
    const cachedSummary = process.env.NODE_ENV === 'test' ? null : await getCache(summaryCacheKey);
    if (cachedSummary) {
      return res.json(cachedSummary);
    }

    const days = [];

    // Vérifier d'abord si tous les jours ouverts sont déjà en cache
    const cachedDays = [];
    let allCached = true;
    for (let d = 1; d <= maxDay; d++) {
      const cacheKey = `cocktail:advent:${year}:${d}`;
      const cached = process.env.NODE_ENV === 'test' ? null : await getCache(cacheKey);
      cachedDays[d] = cached;
      if (!cached) allCached = false;
    }

    if (!allCached) {
      // Un seul COUNT pour tous les jours
      const count = await prisma.recipe.count({ where: { status: 'PUBLISHED' } });

      if (count > 0) {
        // Pré-calculer tous les indices en une seule passe
        const indices = [];
        for (let d = 1; d <= maxDay; d++) {
          if (!cachedDays[d]) {
            const hash = crypto.createHash('sha256').update(`advent-${year}-${d}`).digest();
            indices.push({ day: d, index: hash.readUInt32BE(0) % count });
          }
        }

        // Charger toutes les recettes nécessaires en une seule requête
        // On utilise un offset/take par index via une sous-requête ordonnée
        const allPublishedIds = await prisma.recipe.findMany({
          where: { status: 'PUBLISHED' },
          orderBy: { id: 'asc' },
          select: { id: true, name: true, imageUrl: true },
        });

        for (const { day, index } of indices) {
          const recipe = allPublishedIds[index];
          if (recipe) cachedDays[day] = recipe;
        }
      }
    }

    // Construire le résumé à partir des données rassemblées
    for (let d = 1; d <= maxDay; d++) {
      const recipe = cachedDays[d];
      if (recipe) {
        days.push({ day: d, opened: true, recipeName: recipe.name, recipeId: recipe.id, imageUrl: recipe.imageUrl });
      }
    }

    // Ajouter les jours futurs (verrouillés)
    for (let d = maxDay + 1; d <= 24; d++) {
      days.push({ day: d, opened: false });
    }

    const result = { available: true, year, currentDay: maxDay, days };

    // Mettre en cache le résumé complet jusqu'à la prochaine case (minuit)
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
    const ttl = Math.max(60, Math.floor(msUntilMidnight / 1000));
    setCache(summaryCacheKey, result, ttl).catch(() => {});

    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAdventRecipe, getAdventSummary };
