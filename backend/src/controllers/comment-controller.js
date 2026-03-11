const prisma = require('../prisma');

// GET /comments/:recipeId
const getComments = async (req, res) => {
  const recipeId = parseInt(req.params.recipeId);

  const comments = await prisma.comment.findMany({
    where: { recipeId },
    include: {
      user: { select: { id: true, pseudo: true, avatar: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(comments);
};

// POST /comments/:recipeId — auth requise
const createComment = async (req, res) => {
  const userId   = req.user.id;
  const recipeId = parseInt(req.params.recipeId);
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Le commentaire ne peut pas être vide' });
  }

  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe) return res.status(404).json({ error: 'Recette introuvable' });

  const comment = await prisma.comment.create({
    data: { content: content.trim(), userId, recipeId },
    include: {
      user: { select: { id: true, pseudo: true, avatar: true } },
    },
  });

  res.status(201).json(comment);
};

// DELETE /comments/:id — auteur ou admin
const deleteComment = async (req, res) => {
  const id = parseInt(req.params.id);

  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) return res.status(404).json({ error: 'Commentaire introuvable' });

  if (req.user.role !== 'ADMIN' && comment.userId !== req.user.id) {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  await prisma.comment.delete({ where: { id } });
  res.status(204).send();
};

module.exports = { getComments, createComment, deleteComment };
