const rateLimit = require('express-rate-limit');

// Désactiver les limiteurs en environnement de test
const skip = () => process.env.NODE_ENV === 'test';

const generalLimiter = rateLimit({
  skip,
  windowMs:        15 * 60 * 1000, // 15 minutes
  max:             100,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Trop de requêtes, réessayez dans 15 minutes.' },
});

const authLimiter = rateLimit({
  skip,
  windowMs:        15 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Trop de tentatives, réessayez dans 15 minutes.' },
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

module.exports = { generalLimiter, authLimiter, aiLimiter };
