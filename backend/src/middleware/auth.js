const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

if (!process.env.JWT_SECRET) {
  throw new Error('La variable d\'environnement JWT_SECRET est requise');
}
const JWT_SECRET = process.env.JWT_SECRET;

// Vérifie le token JWT et attache req.user
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};

// Middleware admin — re-vérifie le rôle en BDD
const requireAdmin = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true },
    });
    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    next();
  } catch (err) {
    next(err);
  }
};

// Attache req.user si token présent (sans bloquer si absent)
const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), JWT_SECRET);
    } catch {
      // token invalide ignoré
    }
  }
  next();
};

module.exports = { requireAuth, requireAdmin, optionalAuth, JWT_SECRET };
