const fs = require('fs');
const path = require('path');

// Normalise un imageUrl en chemin absolu dans uploadsDir
const resolveImagePath = (imageUrl, uploadsDir) => {
  if (!imageUrl) return null;
  // Strip leading /uploads/ prefix and resolve relative to uploadsDir
  const relative = imageUrl.replace(/^\/uploads\//, '');
  return path.join(uploadsDir, relative);
};

const prisma = require('../prisma');
const logger = require('../logger');
const { createNotification, notifyFollowers } = require('../services/notification-service');
const { bustRecipeCache } = require('../services/recipe-cache-service');
const { resolveTagNames } = require('./tag-controller');
const { parseId, parseIdOrSlug, badRequest, notFound, forbidden, validationError } = require('../helpers');
const { generateRecipeSlug, uniqueSlug } = require('../utils/slugify');
const { includeDetail, includeList, enrichRecipes, flattenRecipe, handlePrismaError } = require('../helpers/recipe-helpers');
const { createRecipeSchema, updateRecipeSchema, formatZodError } = require('../schemas');
const { checkAndAwardBadges } = require('../services/badge-service');
const { recipeListSchema, search } = require('../services/recipe-search-service');
const { resolveIngredients } = require('../services/ingredient-resolver');

// GET /recipes?page=1&limit=20&q=mojito&categoryId=2&minRating=4&maxTime=10&authorId=1&status=PUBLISHED
const getAllRecipes = async (req, res, next) => {
  try {
    const parsed = recipeListSchema.safeParse(req.query);
    if (!parsed.success) {
      return validationError(res, parsed.error);
    }

    const result = await search({ ...parsed.data, user: req.user });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// GET /recipes/:id
const getRecipeById = async (req, res, next) => {
  try {
  const parsed = parseIdOrSlug(req.params.id);
  if (!parsed) return badRequest(res, 'id invalide');
  const where = parsed.id ? { id: parsed.id } : { slug: parsed.slug };

  const recipe = await prisma.recipe.findUnique({ where, include: includeDetail });
  if (!recipe) return notFound(res, 'Recette introuvable');

  // Les non-admins ne peuvent pas voir les recettes non publiées (sauf leur auteur)
  if (recipe.status === 'PENDING' || recipe.status === 'DRAFT') {
    const isAdmin  = req.user?.role === 'ADMIN';
    const isAuthor = req.user?.id === recipe.authorId;
    if (!isAdmin && !isAuthor) return notFound(res, 'Recette introuvable');
  }

  const ratingAgg = await prisma.rating.aggregate({
    where:  { recipeId: recipe.id },
    _avg:   { score: true },
    _count: { score: true },
  });

  const avgRating    = ratingAgg._avg.score !== null
    ? Math.round(ratingAgg._avg.score * 10) / 10
    : null;
  const ratingsCount = ratingAgg._count.score;

  // Données spécifiques à l'utilisateur connecté (isFavorited, note personnelle)
  let userFields = {};
  if (req.user) {
    const [fav, userRating] = await Promise.all([
      prisma.favorite.findUnique({
        where: { userId_recipeId: { userId: req.user.id, recipeId: recipe.id } },
      }),
      prisma.rating.findUnique({
        where: { userId_recipeId: { userId: req.user.id, recipeId: recipe.id } },
      }),
    ]);
    userFields = { isFavorited: !!fav, userScore: userRating?.score ?? null };
  }

  // Aplatir les tags et supprimer _count
  const cleaned = flattenRecipe(recipe);

  res.json({ ...cleaned, avgRating, ratingsCount, ...userFields });
  } catch (err) {
    next(err);
  }
};

// POST /recipes — auth requise
// ingredients : [{ ingredientId, quantity, unit }] OU [{ name, quantity, unit }]
// steps       : [{ order, description }]
const createRecipe = async (req, res, next) => {
  try {
  const parsed = createRecipeSchema.safeParse(req.body);
  if (!parsed.success) {
    return badRequest(res, formatZodError(parsed.error));
  }

  const { name, description, imageUrl, difficulty, prepTime, servings, categoryId, ingredients, steps, tagIds, tagNames, parentRecipeId, season, status: requestedStatus, sponsorName, sponsorLogo, isSponsored } = parsed.data;

  // Calcul du statut final selon le rôle
  let status;
  if (req.user.role === 'ADMIN') {
    status = ['PUBLISHED', 'DRAFT', 'PENDING'].includes(requestedStatus) ? requestedStatus : 'PUBLISHED';
  } else {
    // Un USER ne peut créer qu'en DRAFT ou PENDING (pas PUBLISHED directement)
    status = requestedStatus === 'DRAFT' ? 'DRAFT' : 'PENDING';
  }
  const authorId = req.user.id;

    // Vérifier l'unicité nom + auteur
    const duplicate = await prisma.recipe.findFirst({ where: { name, authorId } });
    if (duplicate) return badRequest(res, 'Vous avez déjà une recette avec ce nom');

    // Générer le slug
    const authorPseudo = req.user.pseudo;
    const baseSlug = generateRecipeSlug(name, authorPseudo);
    const slug = await uniqueSlug(baseSlug, prisma, 'recipe');

    const resolved = await resolveIngredients(ingredients);

    // Résoudre les tags (par ids ou par noms)
    let resolvedTagIds = [];
    if (tagIds && tagIds.length > 0) {
      resolvedTagIds = tagIds.map(Number);
    } else if (tagNames && tagNames.length > 0) {
      resolvedTagIds = await resolveTagNames(tagNames);
    }

    // Vérifier la contrainte variante (Feature 4)
    if (parentRecipeId) {
      const parent = await prisma.recipe.findUnique({ where: { id: parseInt(parentRecipeId) } });
      if (!parent) return badRequest(res, 'Recette parente introuvable');
      if (parent.status !== 'PUBLISHED') return badRequest(res, 'La recette parente doit être publiée');
      if (parent.parentRecipeId) return badRequest(res, 'Impossible de créer une variante d\'une variante');
    }

    // Les champs sponsoring ne sont accessibles qu'aux admins
    const sponsorFields = req.user.role === 'ADMIN'
      ? {
          isSponsored: isSponsored ?? false,
          sponsorName: sponsorName ?? null,
          sponsorLogo: sponsorLogo ?? null,
        }
      : {};

    const recipe = await prisma.recipe.create({
      data: {
        name,
        slug,
        description,
        imageUrl,
        difficulty,
        prepTime: parseInt(prepTime),
        servings: servings ? parseInt(servings) : null,
        categoryId: parseInt(categoryId),
        status,
        authorId,
        season: season || null,
        ...sponsorFields,
        ...(parentRecipeId ? { parentRecipeId: parseInt(parentRecipeId) } : {}),
        ingredients: {
          create: resolved.map(({ id, quantity, unit }) => ({
            quantity: parseFloat(quantity),
            unit,
            ingredient: { connect: { id } },
          })),
        },
        steps: {
          create: steps.map(({ order, description, imageUrl: stepImg }) => ({
            order: parseInt(order),
            description,
            ...(stepImg ? { imageUrl: stepImg } : {}),
          })),
        },
        ...(resolvedTagIds.length > 0 ? {
          tags: {
            create: resolvedTagIds.map((tagId) => ({ tag: { connect: { id: tagId } } })),
          },
        } : {}),
      },
      include: includeDetail,
    });

    const [enriched] = await enrichRecipes([recipe]);
    res.status(201).json(enriched);

    bustRecipeCache();

    // Notifier les followers si publication directe (admin) — fire and forget
    if (status === 'PUBLISHED') {
      notifyFollowers({
        authorId,
        type: 'NEW_RECIPE',
        data: {
          recipeId:     recipe.id,
          recipeSlug:   recipe.slug,
          recipeName:   recipe.name,
          authorId,
          authorPseudo: recipe.author?.pseudo ?? null,
        },
      }).catch(console.error);
    }

    // Vérifier les badges liés aux recettes — fire and forget
    checkAndAwardBadges(authorId).catch(console.error);
  } catch (err) {
    next(err);
  }
};

// PUT /recipes/:id — auth requise (auteur ou admin)
const updateRecipe = async (req, res, next) => {
  const parsedParam = parseIdOrSlug(req.params.id);
  if (!parsedParam) return badRequest(res, 'id invalide');
  const where = parsedParam.id ? { id: parsedParam.id } : { slug: parsedParam.slug };

  const parsed = updateRecipeSchema.safeParse(req.body);
  if (!parsed.success) {
    return badRequest(res, formatZodError(parsed.error));
  }

  const { name, description, imageUrl, difficulty, prepTime, servings, categoryId, ingredients, steps, tagIds, tagNames, parentRecipeId, season, status: requestedStatus, sponsorName, sponsorLogo, isSponsored } = parsed.data;

  const exists = await prisma.recipe.findUnique({ where });
  if (!exists) return notFound(res, 'Recette introuvable');
  const id = exists.id;

  // Seul l'auteur ou un admin peut modifier
  if (req.user.role !== 'ADMIN' && exists.authorId !== req.user.id) {
    return forbidden(res);
  }

  // Régénérer le slug si le nom change
  let newSlug;
  if (name !== undefined && name !== exists.name) {
    const duplicateName = await prisma.recipe.findFirst({
      where: { name, authorId: exists.authorId, id: { not: id } },
    });
    if (duplicateName) return badRequest(res, 'Vous avez déjà une recette avec ce nom');

    const author = exists.authorId
      ? await prisma.user.findUnique({ where: { id: exists.authorId }, select: { pseudo: true } })
      : null;
    const baseSlug = generateRecipeSlug(name, author?.pseudo);
    newSlug = await uniqueSlug(baseSlug, prisma, 'recipe', id);
  }

  // Calcul du statut final (les users ne peuvent pas passer directement en PUBLISHED)
  let newStatus;
  if (requestedStatus !== undefined) {
    if (req.user.role === 'ADMIN') {
      newStatus = requestedStatus;
    } else if (requestedStatus !== 'PUBLISHED') {
      newStatus = requestedStatus;
    }
  }

  try {
    const resolved = ingredients !== undefined ? await resolveIngredients(ingredients) : undefined;

    // Résoudre les tags si fournis
    let resolvedTagIds;
    if (tagIds !== undefined) {
      resolvedTagIds = tagIds.map(Number);
    } else if (tagNames !== undefined) {
      resolvedTagIds = await resolveTagNames(tagNames);
    }

    // Valider la contrainte variante si parentRecipeId est fourni (#257)
    if (parentRecipeId !== undefined && parentRecipeId !== null) {
      const parent = await prisma.recipe.findUnique({ where: { id: parseInt(parentRecipeId) } });
      if (!parent) return badRequest(res, 'Recette parente introuvable');
      if (parent.status !== 'PUBLISHED') return badRequest(res, 'La recette parente doit être publiée');
      if (parent.parentRecipeId) return badRequest(res, 'Impossible de créer une variante d\'une variante');
    }

    const recipe = await prisma.$transaction(async (tx) => {
      // Sauvegarder une révision avant la mise à jour (versioning #229)
      try {
        const snapshot = await tx.recipe.findUnique({
          where: { id },
          include: { ingredients: { include: { ingredient: true } }, steps: true, tags: { include: { tag: true } } },
        });
        if (snapshot) {
          const lastRevision = await tx.recipeRevision.findFirst({
            where: { recipeId: id },
            orderBy: { version: 'desc' },
            select: { version: true },
          });
          const nextVersion = (lastRevision?.version || 0) + 1;
          await tx.recipeRevision.create({
            data: {
              recipeId: id,
              version: nextVersion,
              authorId: req.user.id,
              message: req.body.revisionMessage || null,
              data: {
                name: snapshot.name,
                description: snapshot.description,
                difficulty: snapshot.difficulty,
                prepTime: snapshot.prepTime,
                servings: snapshot.servings,
                categoryId: snapshot.categoryId,
                season: snapshot.season,
                ingredients: snapshot.ingredients.map((ri) => ({
                  name: ri.ingredient.name,
                  quantity: ri.quantity,
                  unit: ri.unit,
                })),
                steps: snapshot.steps.map((s) => ({ order: s.order, description: s.description })),
                tags: snapshot.tags.map((rt) => rt.tag.name),
              },
            },
          });
        }
      } catch (revErr) {
        // Ne pas bloquer la mise à jour si le versioning échoue
        logger.error('versioning', 'Erreur sauvegarde révision', { error: revErr.message });
      }

      if (resolved !== undefined) {
        await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
      }
      if (steps !== undefined) {
        await tx.step.deleteMany({ where: { recipeId: id } });
      }
      // Recréer les tags si fournis
      if (resolvedTagIds !== undefined) {
        await tx.recipeTag.deleteMany({ where: { recipeId: id } });
      }

      return tx.recipe.update({
        where: { id },
        data: {
          ...(name        !== undefined && { name }),
          ...(newSlug !== undefined && { slug: newSlug }),
          ...(description !== undefined && { description }),
          ...(imageUrl    !== undefined && { imageUrl }),
          ...(difficulty  !== undefined && { difficulty }),
          ...(prepTime    !== undefined && { prepTime: parseInt(prepTime) }),
          ...(servings    !== undefined && { servings: servings ? parseInt(servings) : null }),
          ...(categoryId  !== undefined && { categoryId: parseInt(categoryId) }),
          ...(season          !== undefined && { season: season || null }),
          ...(newStatus       !== undefined && { status: newStatus }),
          ...(parentRecipeId  !== undefined && { parentRecipeId: parentRecipeId ? parseInt(parentRecipeId) : null }),
          ...(req.user.role === 'ADMIN' ? {
            ...(isSponsored  !== undefined && { isSponsored }),
            ...(sponsorName  !== undefined && { sponsorName }),
            ...(sponsorLogo  !== undefined && { sponsorLogo }),
          } : {}),
          ...(resolved    !== undefined && {
            ingredients: {
              create: resolved.map(({ id: ingId, quantity, unit }) => ({
                quantity: parseFloat(quantity),
                unit,
                ingredient: { connect: { id: ingId } },
              })),
            },
          }),
          ...(steps !== undefined && {
            steps: {
              create: steps.map(({ order, description, imageUrl: stepImg }) => ({
                order: parseInt(order),
                description,
                ...(stepImg ? { imageUrl: stepImg } : {}),
              })),
            },
          }),
          ...(resolvedTagIds !== undefined && {
            tags: {
              create: resolvedTagIds.map((tagId) => ({ tag: { connect: { id: tagId } } })),
            },
          }),
        },
        include: includeDetail,
      });
    });

    const [enriched] = await enrichRecipes([recipe]);
    res.json(enriched);
    bustRecipeCache();
  } catch (err) {
    next(err);
  }
};

// DELETE /recipes/:id — auth requise (auteur ou admin)
const deleteRecipe = async (req, res, next) => {
  try {
    const parsedParam = parseIdOrSlug(req.params.id);
    if (!parsedParam) return badRequest(res, 'id invalide');
    const where = parsedParam.id ? { id: parsedParam.id } : { slug: parsedParam.slug };

    const exists = await prisma.recipe.findUnique({
      where,
      include: { steps: { select: { imageUrl: true } } },
    });
    if (!exists) return notFound(res, 'Recette introuvable');

    if (req.user.role !== 'ADMIN' && exists.authorId !== req.user.id) {
      return forbidden(res);
    }

    await prisma.$transaction([
      // Détacher les variantes avant suppression
      prisma.recipe.updateMany({ where: { parentRecipeId: exists.id }, data: { parentRecipeId: null } }),
      prisma.recipe.delete({ where: { id: exists.id } }),
    ]);

    // Nettoyage des images associées (fire and forget)
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
    const imagesToDelete = [];
    const mainImg = resolveImagePath(exists.imageUrl, uploadsDir);
    if (mainImg) imagesToDelete.push(mainImg);
    for (const step of exists.steps) {
      const stepImg = resolveImagePath(step.imageUrl, uploadsDir);
      if (stepImg) imagesToDelete.push(stepImg);
    }
    for (const imgPath of imagesToDelete) {
      fs.unlink(imgPath, () => {});
    }

    logger.info('recipe', 'Recette supprimée', { id: exists.id, name: exists.name, authorId: exists.authorId });
    res.status(204).send();
    bustRecipeCache();
  } catch (err) {
    next(err);
  }
};

// PATCH /recipes/:id/publish — admin seulement
const publishRecipe = async (req, res, next) => {
  try {
    const parsedParam = parseIdOrSlug(req.params.id);
    if (!parsedParam) return badRequest(res, 'id invalide');
    const where = parsedParam.id ? { id: parsedParam.id } : { slug: parsedParam.slug };

    const recipe = await prisma.recipe.findUnique({ where });
    if (!recipe) return notFound(res, 'Recette introuvable');

    const updated = await prisma.recipe.update({
      where: { id: recipe.id },
      data: { status: 'PUBLISHED' },
      include: includeDetail,
    });

    const [enriched] = await enrichRecipes([updated]);
    res.json(enriched);
    bustRecipeCache();

    // Notifications fire and forget
    if (recipe.authorId) {
      createNotification({
        userId: recipe.authorId,
        type:   'RECIPE_APPROVED',
        data:   { recipeId: recipe.id, recipeSlug: recipe.slug, recipeName: recipe.name },
      }).catch(console.error);

      notifyFollowers({
        authorId:     recipe.authorId,
        type:         'NEW_RECIPE',
        data: {
          recipeId:     recipe.id,
          recipeSlug:   recipe.slug,
          recipeName:   recipe.name,
          authorId:     recipe.authorId,
          authorPseudo: updated.author?.pseudo ?? null,
        },
      }).catch(console.error);
    }
  } catch (err) {
    next(err);
  }
};

// PATCH /recipes/:id/unpublish — auteur ou admin
const unpublishRecipe = async (req, res, next) => {
  try {
    const parsedParam = parseIdOrSlug(req.params.id);
    if (!parsedParam) return badRequest(res, 'id invalide');
    const where = parsedParam.id ? { id: parsedParam.id } : { slug: parsedParam.slug };

    const recipe = await prisma.recipe.findUnique({ where });
    if (!recipe) return notFound(res, 'Recette introuvable');

    if (req.user.role !== 'ADMIN' && recipe.authorId !== req.user.id) {
      return forbidden(res);
    }

    const updated = await prisma.recipe.update({
      where: { id: recipe.id },
      data: { status: 'DRAFT' },
      include: includeDetail,
    });

    const [enriched] = await enrichRecipes([updated]);
    res.json(enriched);
    bustRecipeCache();
  } catch (err) {
    next(err);
  }
};

// GET /recipes/seasonal — recettes de saison (basé sur le mois courant)
const getSeasonalRecipes = async (req, res, next) => {
  try {
    // Déterminer la saison en fonction du mois
    const month = new Date().getMonth() + 1; // 1-12
    let season;
    if (month >= 3 && month <= 5)       season = 'spring';
    else if (month >= 6 && month <= 8)  season = 'summer';
    else if (month >= 9 && month <= 11) season = 'autumn';
    else                                season = 'winter';

    const limit = parseInt(req.query.limit) || 4;

    // Récupérer les recettes de la saison courante + celles sans saison (toutes saisons)
    const recipes = await prisma.recipe.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { season },
          { season: null },
        ],
      },
      include: includeList,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const enriched = await enrichRecipes(recipes);
    res.json({ data: enriched, season });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllRecipes, getRecipeById, getSeasonalRecipes, createRecipe, updateRecipe, deleteRecipe, publishRecipe, unpublishRecipe };
