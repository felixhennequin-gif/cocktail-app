const Redis = require('ioredis');

// Connexion Redis — graceful degradation si indisponible
let client = null;

try {
  client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    lazyConnect:        true,
    enableOfflineQueue: false,  // Ne pas accumuler des requêtes si Redis est down
    maxRetriesPerRequest: 1,
  });

  client.on('connect',        () => console.log('[cache] Redis connecté'));
  client.on('error',          (err) => console.error('[cache] Redis erreur:', err.message));
  client.on('reconnecting',   () => console.log('[cache] Redis reconnexion...'));
} catch (err) {
  console.error('[cache] Impossible d\'initialiser Redis:', err.message);
  client = null;
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/** Récupère une valeur cachée (null si absente ou erreur) */
const getCache = async (key) => {
  if (!client) return null;
  try {
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/** Stocke une valeur en cache avec TTL (en secondes) */
const setCache = async (key, value, ttlSeconds) => {
  if (!client) return;
  try {
    await client.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // Silencieux — cache non critique
  }
};

/** Supprime une clé */
const invalidateCache = async (key) => {
  if (!client) return;
  try {
    await client.del(key);
  } catch {}
};

/**
 * Supprime toutes les clés correspondant à un pattern (ex: "GET /recipes*").
 * Utilise SCAN pour ne pas bloquer Redis.
 */
const invalidateCacheByPattern = async (pattern) => {
  if (!client) return;
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) await client.del(...keys);
    } while (cursor !== '0');
  } catch {}
};

// ----------------------------------------------------------------
// Middleware Express — cache GET public uniquement
// ----------------------------------------------------------------

/**
 * Middleware de cache.
 * @param {number} ttlSeconds TTL en secondes
 */
const cacheMiddleware = (ttlSeconds) => async (req, res, next) => {
  // Désactivé en test et pour les requêtes authentifiées
  if (process.env.NODE_ENV === 'test' || req.user) return next();

  const key = req.originalUrl;
  const cached = await getCache(key);

  if (cached !== null) {
    return res.json(cached);
  }

  // Intercepter res.json pour stocker en cache avant d'envoyer
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    setCache(key, body, ttlSeconds).catch(() => {});
    return originalJson(body);
  };

  next();
};

module.exports = { getCache, setCache, invalidateCache, invalidateCacheByPattern, cacheMiddleware };
