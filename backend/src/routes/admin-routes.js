const { Router } = require('express');
const { requireAdminSecret } = require('../middleware/adminAuth');
const { seedCocktails } = require('../scripts/seedCocktails');
const prisma = require('../prisma');

const router = Router();

// Toutes les routes admin sont protégées par le secret
router.use(requireAdminSecret);

// POST /api/admin/seed — Seed cocktails depuis TheCocktailDB
router.post('/seed', async (req, res, next) => {
  try {
    const report = await seedCocktails();
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/users/test — Supprime les utilisateurs de test
router.delete('/users/test', async (req, res, next) => {
  try {
    const testUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: 'test', mode: 'insensitive' } },
          { pseudo: { contains: 'test', mode: 'insensitive' } },
        ],
      },
      select: { id: true, email: true },
    });

    if (testUsers.length === 0) {
      return res.json({ deleted: 0, emails: [] });
    }

    const ids = testUsers.map((u) => u.id);
    await prisma.user.deleteMany({ where: { id: { in: ids } } });

    res.json({
      deleted: testUsers.length,
      emails: testUsers.map((u) => u.email),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
