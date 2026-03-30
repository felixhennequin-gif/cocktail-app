const prisma = require('../prisma');

// Délai minimum entre deux mises à jour de lastUsedAt (1 minute en ms)
const LAST_USED_DEBOUNCE_MS = 60 * 1000;

// Middleware API key — vérifie le header X-API-Key
// Si présent et valide : attache req.apiKeyUser (même structure que req.user)
// Si présent et invalide : renvoie 401
// Si absent : passe au middleware suivant (auth JWT peut encore fonctionner)
const apiKeyMiddleware = async (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (!key) return next();

  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { key },
      include: {
        user: {
          select: { id: true, pseudo: true, role: true, email: true },
        },
      },
    });

    if (!apiKey) {
      return res.status(401).json({ error: 'Clé API invalide' });
    }

    // Mise à jour de lastUsedAt en fire-and-forget, débouncée à 1 minute
    const now = Date.now();
    const lastUsed = apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).getTime() : 0;
    if (now - lastUsed > LAST_USED_DEBOUNCE_MS) {
      prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      }).catch(() => {
        // Erreur silencieuse — la mise à jour n'est pas critique
      });
    }

    req.apiKeyUser = apiKey.user;
    // Compatibilité : si pas de JWT auth en amont, on expose aussi req.user
    // pour que les controllers puissent utiliser req.user indifféremment
    if (!req.user) req.user = apiKey.user;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { apiKeyMiddleware };
