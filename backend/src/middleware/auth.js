const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

if (!process.env.JWT_SECRET) {
  throw new Error('La variable d\'environnement JWT_SECRET est requise');
}
const JWT_SECRET = process.env.JWT_SECRET;

// Vérifie le token JWT et attache req.user avec les données fraîches de la BDD
const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const token = header.slice(7);
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, pseudo: true, role: true, email: true, plan: true, emailVerified: true },
    });
    if (!user) return res.status(401).json({ error: 'Utilisateur introuvable' });
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

// Middleware admin — req.user est déjà chargé depuis la BDD par requireAuth
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
};

// Attache req.user si token présent (sans bloquer si absent), données fraîches depuis la BDD
const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    let decoded;
    try {
      decoded = jwt.verify(header.slice(7), JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
      // token invalide ignoré
      return next();
    }
    try {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, pseudo: true, role: true, email: true, plan: true, emailVerified: true },
      });
      if (user) req.user = user;
    } catch {
      // erreur BDD ignorée pour optionalAuth
    }
  }
  next();
};

// Vérifie que l'email de l'utilisateur est vérifié (à utiliser après requireAuth)
const requireVerifiedEmail = (req, res, next) => {
  if (!req.user?.emailVerified) {
    return res.status(403).json({ error: 'Veuillez vérifier votre adresse email' });
  }
  next();
};

module.exports = { requireAuth, requireAdmin, optionalAuth, requireVerifiedEmail };
