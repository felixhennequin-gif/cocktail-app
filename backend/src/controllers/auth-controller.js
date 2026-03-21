const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const { JWT_SECRET } = require('../middleware/auth');

const SALT_ROUNDS = 10;

// POST /auth/register
const register = async (req, res, next) => {
  try {
    const { email, pseudo, password } = req.body;

    if (!email || !pseudo || !password) {
      return res.status(400).json({ error: 'email, pseudo et password sont requis' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères' });
    }
    if (!/[a-zA-Z]/.test(password)) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins une lettre' });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins un chiffre' });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { pseudo }] },
    });
    if (existing) {
      const field = existing.email === email ? 'email' : 'pseudo';
      return res.status(409).json({ error: `Ce ${field} est déjà utilisé` });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { email, pseudo, passwordHash },
      select: { id: true, email: true, pseudo: true, role: true, createdAt: true },
    });

    const token = jwt.sign({ id: user.id, pseudo: user.pseudo, role: user.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
};

// POST /auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email et password sont requis' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const token = jwt.sign({ id: user.id, pseudo: user.pseudo, role: user.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      user: { id: user.id, email: user.email, pseudo: user.pseudo, role: user.role, avatar: user.avatar },
      token,
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
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, me };
