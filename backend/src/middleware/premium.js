// Middleware vérifiant que l'utilisateur a un plan Premium
const requirePremium = (req, res, next) => {
  if (!req.user || req.user.plan !== 'PREMIUM') {
    return res.status(403).json({ error: 'Cette fonctionnalité nécessite un compte Premium' });
  }
  next();
};

module.exports = { requirePremium };
