const { getLimits } = require('../config/plans');

// Factory : crée un middleware qui vérifie une limite numérique
const checkLimit = (limitKey, countFn, errorMessage) => {
  return async (req, res, next) => {
    try {
      const limits = getLimits(req.user.plan);
      const max = limits[limitKey];

      // Infinity = pas de limite (premium)
      if (max === Infinity) return next();

      const current = await countFn(req);
      if (current >= max) {
        return res.status(403).json({
          error: errorMessage || `Limite atteinte (${current}/${max})`,
          limit: max,
          current,
          upgrade: true,
        });
      }

      // Attacher les infos de limite pour le frontend (headers optionnels)
      res.set('X-Limit-Max', String(max));
      res.set('X-Limit-Current', String(current));

      next();
    } catch (err) {
      next(err);
    }
  };
};

// Vérifie un flag booléen (ex: canExportPdf)
const checkFeature = (featureKey, errorMessage) => {
  return (req, res, next) => {
    const limits = getLimits(req.user.plan);
    if (!limits[featureKey]) {
      return res.status(403).json({
        error: errorMessage || 'Cette fonctionnalité nécessite un compte Premium',
        upgrade: true,
      });
    }
    next();
  };
};

module.exports = { checkLimit, checkFeature };
