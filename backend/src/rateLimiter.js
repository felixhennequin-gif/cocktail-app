const rateLimit = require('express-rate-limit');

// Désactiver les limiteurs en environnement de test
const skip = () => process.env.NODE_ENV === 'test';

const generalLimiter = rateLimit({
  skip,
  windowMs:        15 * 60 * 1000, // 15 minutes
  max:             500,
  standardHeaders: true,
  legacyHeaders:   false,
  message: (req, res) => {
    const retryAfter = res.getHeader('Retry-After') || 900;
    return { error: `Trop de requêtes, réessayez dans ${retryAfter} secondes.` };
  },
});

// Pour les endpoints de polling (ex: GET /notifications)
const pollingLimiter = rateLimit({
  skip,
  windowMs:        15 * 60 * 1000,
  max:             200,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Trop de requêtes de polling, réessayez dans 15 minutes.' },
});

const authLimiter = rateLimit({
  skip,
  windowMs:        15 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Trop de tentatives, réessayez dans 15 minutes.' },
});

const forgotPasswordLimiter = rateLimit({
  skip,
  windowMs:        15 * 60 * 1000,
  max:             3,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Trop de demandes de réinitialisation, réessaie plus tard.' },
});

const resendVerificationLimiter = rateLimit({
  skip,
  windowMs:        15 * 60 * 1000,
  max:             3,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Trop de demandes de renvoi, réessaie plus tard.' },
});

const changePasswordLimiter = rateLimit({
  skip,
  windowMs:        15 * 60 * 1000,
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Trop de tentatives, réessaie plus tard.' },
});

// Réservé à la phase 4 (POST /ai/*)
const aiLimiter = rateLimit({
  skip,
  windowMs:        60 * 1000, // 1 minute
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: "Limite d'appels IA atteinte, réessayez dans une minute." },
});

// API publique v1 — sans clé : 100 req/h, avec clé : 1000 req/h
const apiV1AnonLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             100,
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            (req) => process.env.NODE_ENV === 'test' || !!req.apiKeyUser,
  message:         { error: 'Limite atteinte. Créez une clé API pour 1000 req/h.' },
});

const apiV1KeyLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             1000,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    (req) => (req.apiKeyUser ? `key:${req.apiKeyUser.id}` : req.ip),
  validate:        { keyGeneratorIpFallback: false },
  skip:            (req) => process.env.NODE_ENV === 'test' || !req.apiKeyUser,
  message:         { error: 'Limite de clé API atteinte. Réessayez dans une heure.' },
});

module.exports = { generalLimiter, authLimiter, pollingLimiter, aiLimiter, forgotPasswordLimiter, resendVerificationLimiter, changePasswordLimiter, apiV1AnonLimiter, apiV1KeyLimiter };
