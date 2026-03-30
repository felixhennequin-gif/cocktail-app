const fs = require('fs');
const path = require('path');
const prisma = require('../prisma');
const logger = require('../logger');
const { createNotification, notifyFollowers } = require('../services/notification-service');
const { bustRecipeCache } = require('../services/recipe-cache-service');
const { resolveTagNames } = require('./tag-controller');
const { parseId, badRequest, notFound, forbidden } = require('../helpers');
const { includeDetail, enrichRecipes, flattenRecipe, handlePrismaError } = require('../helpers/recipe-helpers');
const { createRecipeSchema, updateRecipeSchema, formatZodError } = require('../schemas');
const { checkAndAwardBadges } = require('../services/badge-service');
const { recipeListSchema, search } = require('../services/recipe-search-service');
const { resolveIngredients } = require('../services/ingredient-resolver');

// GET /recipes?page=1&limit=20&q=mojito&categoryId=2&minRating=4&maxTime=10&authorId=1&status=PUBLISHED
const getAllRecipes = async (req, res, next) => {
  try {
    const parsed = recipeListSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors, code: 'VALIDATION_ERROR' });
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
  const id = parseId(req.params.id);
  if (!id) return badRequest(res, 'id invalide');

  const [recipe, ratingAgg] = await Promise.all([
    prisma.recipe.findUnique({
      where: { id },
      include: includeDetail,
    }),
    prisma.rating.aggregate({
      where:  { recipeId: id },
      _avg:   { score: true },
      _count: { score: true },
    }),
  ]);

  if (!recipe) return notFound(res, 'Recette introuvable');

  // Les non-admins ne peuvent pas voir les recettes non publiées (sauf leur auteur)
  if (recipe.status === 'PENDING' || recipe.status === 'DRAFT') {
    const isAdmin  = req.user?.role === 'ADMIN';
    const isAuthor = req.user?.id === recipe.authorId;
    if (!isAdmin && !isAuthor) return notFound(res, 'Recette introuvable');
  }

  const avgRating    = ratingAgg._avg.score !== null
    ? Math.round(ratingAgg._avg.score * 10) / 10
    : null;
  const ratingsCount = ratingAgg._count.score;

  // Données spécifiques à l'utilisateur connecté (isFavorited, note personnelle)
  let userFields = {};
  if (req.user) {
    const [fav, userRating] = await Promise.all([
      prisma.favorite.findUnique({
        where: { userId_recipeId: { userId: req.user.id, recipeId: id } },
      }),
      prisma.rating.findUnique({
        where: { userId_recipeId: { userId: req.user.id, recipeId: id } },
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

  const { name, description, imageUrl, difficulty, prepTime, servings, categoryId, ingredients, steps, tagIds, tagNames, parentRecipeId, status: requestedStatus } = parsed.data;

  // Calcul du statut final selon le rôle
  let status;
  if (req.user.role === 'ADMIN') {
    status = ['PUBLISHED', 'DRAFT', 'PENDING'].includes(requestedStatus) ? requestedStatus : 'PUBLISHED';
  } else {
    // Un USER ne peut créer qu'en DRAFT ou PENDING (pas PUBLISHED directement)
    status = requestedStatus === 'DRAFT' ? 'DRAFT' : 'PENDING';
  }
  const authorId = req.user.id;
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

    const recipe = await prisma.recipe.create({
      data: {
        name,
        description,
        imageUrl,
        difficulty,
        prepTime: parseInt(prepTime),
        servings: servings ? parseInt(servings) : null,
        categoryId: parseInt(categoryId),
        status,
        authorId,
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
  const id = parseId(req.params.id);
  if (!id) return badRequest(res, 'id invalide');

  const parsed = updateRecipeSchema.safeParse(req.body);
  if (!parsed.success) {
    return badRequest(res, formatZodError(parsed.error));
  }

  const { name, description, imageUrl, difficulty, prepTime, servings, categoryId, ingredients, steps, tagIds, tagNames, status: requestedStatus } = parsed.data;

  const exists = await prisma.recipe.findUnique({ where: { id } });
  if (!exists) return notFound(res, 'Recette introuvable');

  // Seul l'auteur ou un admin peut modifier
  if (req.user.role !== 'ADMIN' && exists.authorId !== req.user.id) {
    return forbidden(res);
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

    const recipe = await prisma.$transaction(async (tx) => {
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
          ...(description !== undefined && { description }),
          ...(imageUrl    !== undefined && { imageUrl }),
          ...(difficulty  !== undefined && { difficulty }),
          ...(prepTime    !== undefined && { prepTime: parseInt(prepTime) }),
          ...(servings    !== undefined && { servings: servings ? parseInt(servings) : null }),
          ...(categoryId  !== undefined && { categoryId: parseInt(categoryId) }),
          ...(newStatus   !== undefined && { status: newStatus }),
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
    const id = parseId(req.params.id);
    if (!id) return badRequest(res, 'id invalide');

    const exists = await prisma.recipe.findUnique({
      where: { id },
      include: { steps: { select: { imageUrl: true } } },
    });
    if (!exists) return notFound(res, 'Recette introuvable');

    if (req.user.role !== 'ADMIN' && exists.authorId !== req.user.id) {
      return forbidden(res);
    }

    await prisma.$transaction([
      // Détacher les variantes avant suppression
      prisma.recipe.updateMany({ where: { parentRecipeId: id }, data: { parentRecipeId: null } }),
      prisma.recipe.delete({ where: { id } }),
    ]);

    // Nettoyage des images associées (fire and forget)
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
    const imagesToDelete = [];
    if (exists.imageUrl) imagesToDelete.push(path.join(uploadsDir, path.basename(exists.imageUrl)));
    for (const step of exists.steps) {
      if (step.imageUrl) imagesToDelete.push(path.join(uploadsDir, ...step.imageUrl.replace('/uploads/', '').split('/')));
    }
    for (const imgPath of imagesToDelete) {
      fs.unlink(imgPath, () => {});
    }

    logger.info('recipe', 'Recette supprimée', { id, name: exists.name, authorId: exists.authorId });
    res.status(204).send();
    bustRecipeCache();
  } catch (err) {
    next(err);
  }
};

// PATCH /recipes/:id/publish — admin seulement
const publishRecipe = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return badRequest(res, 'id invalide');

    const recipe = await prisma.recipe.findUnique({ where: { id } });
    if (!recipe) return notFound(res, 'Recette introuvable');

    const updated = await prisma.recipe.update({
      where: { id },
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
        data:   { recipeId: recipe.id, recipeName: recipe.name },
      }).catch(console.error);

      notifyFollowers({
        authorId:     recipe.authorId,
        type:         'NEW_RECIPE',
        data: {
          recipeId:     recipe.id,
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
    const id = parseId(req.params.id);
    if (!id) return badRequest(res, 'id invalide');

    const recipe = await prisma.recipe.findUnique({ where: { id } });
    if (!recipe) return notFound(res, 'Recette introuvable');

    if (req.user.role !== 'ADMIN' && recipe.authorId !== req.user.id) {
      return forbidden(res);
    }

    const updated = await prisma.recipe.update({
      where: { id },
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

module.exports = { getAllRecipes, getRecipeById, createRecipe, updateRecipe, deleteRecipe, publishRecipe, unpublishRecipe };
