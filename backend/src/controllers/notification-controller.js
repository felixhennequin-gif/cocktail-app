const prisma = require('../prisma');

// GET /notifications — 20 dernières + unreadCount
const getNotifications = async (req, res) => {
  const userId = req.user.id;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    20,
    }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);

  res.json({ data: notifications, unreadCount });
};

// PUT /notifications/read-all — marquer toutes comme lues
const markAllRead = async (req, res) => {
  const result = await prisma.notification.updateMany({
    where: { userId: req.user.id, read: false },
    data:  { read: true },
  });

  res.json({ updated: result.count });
};

// PUT /notifications/:id/read — marquer une notif comme lue
const markOneRead = async (req, res) => {
  const id = parseInt(req.params.id);

  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif) return res.status(404).json({ error: 'Notification introuvable' });
  if (notif.userId !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });

  await prisma.notification.update({ where: { id }, data: { read: true } });

  res.json({ ok: true });
};

module.exports = { getNotifications, markAllRead, markOneRead };
