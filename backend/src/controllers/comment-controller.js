const prisma = require('../prisma');
const { createNotification } = require('../services/notification-service');
const { parseId } = require('../helpers');
const { createCommentSchema, updateCommentSchema, formatZodError } = require('../schemas');

// GET /comments/:recipeId — optionalAuth pour exposer myComment + avgRating
const getComments = async (req, res) => {
  const recipeId = parseId(req.params.recipeId);
  if (!recipeId) return res.status(400).json({ error: 'recipeId invalide' });

  const [comments, ratingAgg] = await Promise.all([
    prisma.comment.findMany({
      where: { recipeId },
      include: {
        user: { select: { id: true, pseudo: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.rating.aggregate({
      where: { recipeId },
      _avg:   { score: true },
      _count: { score: true },
    }),
  ]);

  const avgRating    = ratingAgg._avg.score !== null
    ? Math.round(ratingAgg._avg.score * 10) / 10
    : null;
  const ratingsCount = ratingAgg._count.score;

  const myComment = req.user
    ? comments.find((c) => c.userId === req.user.id) ?? null
    : null;

  res.json({ comments, myComment, avgRating, ratingsCount });
};

// POST /comments/:recipeId — auth requise
// body: { content, score (1-5, obligatoire) }
const createComment = async (req, res) => {
  const userId   = req.user.id;
  const recipeId = parseId(req.params.recipeId);
  if (!recipeId) return res.status(400).json({ error: 'recipeId invalide' });

  const parsed = createCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: formatZodError(parsed.error) });
  }

  const { content, score: scoreInt } = parsed.data;

  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe) return res.status(404).json({ error: 'Recette introuvable' });

  if (recipe.authorId === userId) {
    return res.status(403).json({ error: 'Vous ne pouvez pas commenter votre propre recette' });
  }

  // Vérifier si l'utilisateur a déjà commenté cette recette
  const existingComment = await prisma.comment.findFirst({
    where: { userId, recipeId },
  });
  if (existingComment) {
    return res.status(409).json({ error: 'Vous avez déjà commenté cette recette' });
  }

  // Créer le commentaire et upsert la note dans une transaction
  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: { content, userId, recipeId },
      include: {
        user: { select: { id: true, pseudo: true, avatar: true } },
      },
    });

    await tx.rating.upsert({
      where:  { userId_recipeId: { userId, recipeId } },
      create: { userId, recipeId, score: scoreInt },
      update: { score: scoreInt },
    });

    return created;
  });

  res.status(201).json(comment);

  // Notifier l'auteur de la recette — fire and forget
  if (recipe.authorId && recipe.authorId !== userId) {
    createNotification({
      userId: recipe.authorId,
      type:   'COMMENT_ON_RECIPE',
      data: {
        recipeId,
        recipeName:      recipe.name,
        commenterId:     userId,
        commenterPseudo: comment.user.pseudo,
        commentPreview:  content.slice(0, 50),
      },
    }).catch(console.error);
  }
};

// PUT /comments/:id — auteur uniquement
// body: { content, score? (1-5, optionnel) }
const updateComment = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'id invalide' });

  const parsed = updateCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: formatZodError(parsed.error) });
  }

  const { content, score: scoreInt } = parsed.data;

  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) return res.status(404).json({ error: 'Commentaire introuvable' });

  if (comment.userId !== req.user.id) {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.comment.update({
      where: { id },
      data:  { content },
      include: { user: { select: { id: true, pseudo: true, avatar: true } } },
    });

    if (scoreInt != null) {
      await tx.rating.upsert({
        where:  { userId_recipeId: { userId: comment.userId, recipeId: comment.recipeId } },
        create: { userId: comment.userId, recipeId: comment.recipeId, score: scoreInt },
        update: { score: scoreInt },
      });
    }

    return result;
  });

  res.json(updated);
};

// DELETE /comments/:id — auteur du commentaire, auteur de la recette ou admin
const deleteComment = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'id invalide' });

  const comment = await prisma.comment.findUnique({
    where: { id },
    include: { recipe: { select: { authorId: true } } },
  });
  if (!comment) return res.status(404).json({ error: 'Commentaire introuvable' });

  const isAdmin        = req.user.role === 'ADMIN';
  const isCommentAuthor = comment.userId === req.user.id;
  const isRecipeAuthor  = comment.recipe.authorId === req.user.id;

  if (!isAdmin && !isCommentAuthor && !isRecipeAuthor) {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  await prisma.comment.delete({ where: { id } });
  res.status(204).send();
};

module.exports = { getComments, createComment, updateComment, deleteComment };
