const prisma = require('../prisma');
const { createNotification } = require('../services/notification-service');
const { parseId } = require('../helpers');

// POST /users/:id/follow — JWT requis
const followUser = async (req, res) => {
  const targetId = parseId(req.params.id);
  if (!targetId) return res.status(400).json({ error: 'id invalide' });

  const userId = req.user.id;

  if (userId === targetId) {
    return res.status(400).json({ error: 'Vous ne pouvez pas vous suivre vous-même' });
  }

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' });

  // Vérifier si la relation existait déjà (pour éviter une notif en double)
  const alreadyFollowing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: userId, followingId: targetId } },
  });

  // Idempotent : pas d'erreur si déjà suivi
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: userId, followingId: targetId } },
    create: { followerId: userId, followingId: targetId },
    update: {},
  });

  res.json({ following: true });

  // Notifier l'utilisateur suivi — fire and forget, seulement si nouveau follow
  if (!alreadyFollowing) {
    createNotification({
      userId: targetId,
      type:   'NEW_FOLLOWER',
      data: {
        followerId:     userId,
        followerPseudo: req.user.pseudo,
      },
    }).catch(console.error);
  }
};

// DELETE /users/:id/follow — JWT requis
const unfollowUser = async (req, res) => {
  const targetId = parseId(req.params.id);
  if (!targetId) return res.status(400).json({ error: 'id invalide' });

  const userId = req.user.id;

  // Silencieux si la relation n'existe pas
  await prisma.follow.deleteMany({
    where: { followerId: userId, followingId: targetId },
  });

  res.json({ following: false });
};

// Retourne les IDs que l'utilisateur connecté suit (pour le champ isFollowing)
const getMyFollowingIds = async (currentUserId) => {
  if (!currentUserId) return new Set();
  const rows = await prisma.follow.findMany({
    where: { followerId: currentUserId },
    select: { followingId: true },
  });
  return new Set(rows.map((r) => r.followingId));
};

// GET /users/:id/followers?page=1&limit=20
const getFollowers = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'id invalide' });

  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

  const [follows, total, myFollowingIds] = await Promise.all([
    prisma.follow.findMany({
      where: { followingId: id },
      include: { follower: { select: { id: true, pseudo: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.follow.count({ where: { followingId: id } }),
    getMyFollowingIds(req.user?.id),
  ]);

  const data = follows.map((f) => ({
    ...f.follower,
    isFollowing: myFollowingIds.has(f.follower.id),
  }));

  res.json({ data, total, page, limit });
};

// GET /users/:id/following?page=1&limit=20
const getFollowing = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'id invalide' });

  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

  const [follows, total, myFollowingIds] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: id },
      include: { following: { select: { id: true, pseudo: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.follow.count({ where: { followerId: id } }),
    getMyFollowingIds(req.user?.id),
  ]);

  const data = follows.map((f) => ({
    ...f.following,
    isFollowing: myFollowingIds.has(f.following.id),
  }));

  res.json({ data, total, page, limit });
};

module.exports = { followUser, unfollowUser, getFollowers, getFollowing };
