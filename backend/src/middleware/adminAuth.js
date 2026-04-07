// Middleware d'authentification admin par secret partagé.
// Vérifie le header x-admin-secret contre ADMIN_SECRET.
const requireAdminSecret = (req, res, next) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Secret admin invalide ou manquant', code: 'UNAUTHORIZED' });
  }
  next();
};

module.exports = { requireAdminSecret };
