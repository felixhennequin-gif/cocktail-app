const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const prisma = require('../prisma');
const { JWT_SECRET } = require('../middleware/auth');
const { registerSchema, loginSchema, formatZodError } = require('../schemas');
const { badRequest, unauthorized, notFound, conflict } = require('../helpers');

const SALT_ROUNDS = 10;

// Durée de validité du refresh token : 7 jours en ms
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Nombre maximum de refresh tokens actifs par utilisateur
const MAX_REFRESH_TOKENS_PER_USER = 5;

// Crée et persiste un refresh token pour un utilisateur donné
const createRefreshToken = async (userId) => {
  const token = randomUUID();
  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
  return token;
};

// Nettoie les refresh tokens expirés et limite à MAX_REFRESH_TOKENS_PER_USER par utilisateur
const cleanupRefreshTokens = async (userId) => {
  // Supprime les tokens expirés
  await prisma.refreshToken.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  });

  // Limite au maximum autorisé (garde les plus récents)
  const tokensToDelete = await prisma.refreshToken.findMany({
    where: { userId },
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

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { pseudo }] },
    });
    if (existing) {
      const field = existing.email === email ? 'email' : 'pseudo';
      return conflict(res, `Ce ${field} est déjà utilisé`);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { email, pseudo, passwordHash },
      select: { id: true, email: true, pseudo: true, role: true, createdAt: true },
    });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, {
      expiresIn: '15m',
    });

    const refreshToken = await createRefreshToken(user.id);
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
    });

    const refreshToken = await createRefreshToken(user.id);
    await cleanupRefreshTokens(user.id);

    res.json({
      user: { id: user.id, email: user.email, pseudo: user.pseudo, role: user.role, avatar: user.avatar },
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
      select: { id: true, email: true, pseudo: true, role: true, avatar: true, createdAt: true },
    });
    if (!user) return notFound(res, 'Utilisateur introuvable');
    res.json(user);
  } catch (err) {
    next(err);
  }
};

// POST /auth/refresh — émet un nouvel access token à partir d'un refresh token valide
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return badRequest(res, 'Refresh token requis');

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      return unauthorized(res, 'Refresh token invalide ou expiré');
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) return unauthorized(res, 'Utilisateur introuvable');

    // Rotation du refresh token — invalide l'ancien et en crée un nouveau
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    const newRefreshToken = await createRefreshToken(user.id);

    const newAccessToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '15m' });

    res.json({ token: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
};

// POST /auth/logout — invalide le refresh token en BDD
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken, userId: req.user.id },
      });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, me, refresh, logout };
