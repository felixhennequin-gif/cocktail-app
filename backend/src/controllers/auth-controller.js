const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const prisma = require('../prisma');
const logger = require('../logger');
const { JWT_SECRET } = require('../middleware/auth');
const { registerSchema, loginSchema, refreshSchema, logoutSchema, formatZodError } = require('../schemas');
const { badRequest, unauthorized, notFound, conflict } = require('../helpers');

const SALT_ROUNDS = 10;

// Durée de validité du refresh token : 7 jours en ms
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Nombre maximum de refresh tokens actifs par utilisateur
const MAX_REFRESH_TOKENS_PER_USER = 5;

// Crée et persiste un refresh token pour un utilisateur donné
// family : identifiant de la chaîne de rotation (nouveau si login, hérité si refresh)
const createRefreshToken = async (userId, family) => {
  const token = randomUUID();
  const tokenFamily = family || randomUUID();
  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      family: tokenFamily,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
  return { token, family: tokenFamily };
};

// Nettoie les refresh tokens expirés et les tokens consommés anciens
const cleanupRefreshTokens = async (userId) => {
  // Supprime les tokens expirés et les tokens consommés de plus de 24h
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.refreshToken.deleteMany({
    where: {
      userId,
      OR: [
        { expiresAt: { lt: new Date() } },
        { consumed: true, createdAt: { lt: oneDayAgo } },
      ],
    },
  });

  // Limite au maximum autorisé (garde les plus récents non-consommés)
  const tokensToDelete = await prisma.refreshToken.findMany({
    where: { userId, consumed: false },
    orderBy: { createdAt: 'desc' },
    skip: MAX_REFRESH_TOKENS_PER_USER,
    select: { id: true },
  });
  if (tokensToDelete.length > 0) {
    await prisma.refreshToken.deleteMany({
      where: { id: { in: tokensToDelete.map((t) => t.id) } },
    });
  }
};

// POST /auth/register
const register = async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, formatZodError(parsed.error));
    }

    const { email, pseudo, password } = parsed.data;

    // Toujours calculer le hash pour éviter les attaques par timing
    // (un attaquant ne peut pas distinguer email existant vs inexistant par le temps de réponse)
    const [existing, passwordHash] = await Promise.all([
      prisma.user.findFirst({ where: { OR: [{ email }, { pseudo }] } }),
      bcrypt.hash(password, SALT_ROUNDS),
    ]);
    if (existing) {
      const field = existing.email === email ? 'email' : 'pseudo';
      return conflict(res, `Ce ${field} est déjà utilisé`);
    }
    const user = await prisma.user.create({
      data: { email, pseudo, passwordHash },
      select: { id: true, email: true, pseudo: true, role: true, plan: true, createdAt: true },
    });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, {
      expiresIn: '15m',
      algorithm: 'HS256',
    });

    const { token: refreshToken } = await createRefreshToken(user.id);
    await cleanupRefreshTokens(user.id);

    res.status(201).json({ user, token, refreshToken });
  } catch (err) {
    next(err);
  }
};

// POST /auth/login
const login = async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, formatZodError(parsed.error));
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return unauthorized(res, 'Identifiants invalides');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return unauthorized(res, 'Identifiants invalides');
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, {
      expiresIn: '15m',
      algorithm: 'HS256',
    });

    const { token: refreshToken } = await createRefreshToken(user.id);
    await cleanupRefreshTokens(user.id);

    res.json({
      user: { id: user.id, email: user.email, pseudo: user.pseudo, role: user.role, plan: user.plan, avatar: user.avatar },
      token,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

// GET /auth/me — infos de l'utilisateur connecté
const me = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, pseudo: true, role: true, plan: true, avatar: true, createdAt: true },
    });
    if (!user) return notFound(res, 'Utilisateur introuvable');
    res.json(user);
  } catch (err) {
    next(err);
  }
};

// POST /auth/refresh — émet un nouvel access token à partir d'un refresh token valide
// Implémente la détection de réutilisation (refresh token reuse detection)
const refresh = async (req, res, next) => {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, formatZodError(parsed.error));
    const { refreshToken } = parsed.data;

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });

    if (!stored || stored.expiresAt < new Date()) {
      // Token inconnu ou expiré
      if (stored) {
        await prisma.refreshToken.delete({ where: { id: stored.id } }).catch(() => {});
      }
      return unauthorized(res, 'Refresh token invalide ou expiré');
    }

    // Détection de réutilisation : token déjà consommé → vol probable
    if (stored.consumed) {
      // Invalider TOUS les tokens de cette famille
      await prisma.refreshToken.deleteMany({ where: { family: stored.family } });
      logger.warn('auth', 'Refresh token réutilisé — famille invalidée', { userId: stored.userId, family: stored.family });
      return unauthorized(res, 'Refresh token réutilisé — session révoquée par sécurité');
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) return unauthorized(res, 'Utilisateur introuvable');

    // Marquer l'ancien token comme consommé (au lieu de le supprimer)
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { consumed: true },
    });

    // Créer un nouveau token dans la même famille
    const { token: newRefreshToken } = await createRefreshToken(user.id, stored.family);

    const newAccessToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '15m', algorithm: 'HS256' });

    res.json({ token: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
};

// POST /auth/logout — invalide le refresh token en BDD
const logout = async (req, res, next) => {
  try {
    const parsed = logoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, formatZodError(parsed.error));
    }
    const { refreshToken } = parsed.data;
    // Trouver le token et supprimer toute la famille
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (stored && stored.userId === req.user.id) {
      await prisma.refreshToken.deleteMany({ where: { family: stored.family } });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// Nettoyage global des refresh tokens expirés (tous les utilisateurs)
const cleanupAllExpiredRefreshTokens = async () => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { consumed: true, createdAt: { lt: oneDayAgo } },
      ],
    },
  });
  if (result.count > 0) {
    logger.info('auth', `Nettoyage : ${result.count} refresh tokens expirés supprimés`);
  }
};

module.exports = { register, login, me, refresh, logout, cleanupAllExpiredRefreshTokens };
