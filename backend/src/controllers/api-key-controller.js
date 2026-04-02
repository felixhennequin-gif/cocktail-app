const crypto = require('crypto');
const prisma = require('../prisma');

// Nombre maximum de clés API par utilisateur
const MAX_KEYS_PER_USER = 5;

// Génère une clé API aléatoire de 32 octets (64 caractères hex)
const generateApiKey = () => crypto.randomBytes(32).toString('hex');

// GET /api/api-keys — liste les clés de l'utilisateur connecté
const listApiKeys = async (req, res, next) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastUsedAt: true,
        // La valeur brute de la clé n'est jamais renvoyée après création
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(keys);
  } catch (err) {
    next(err);
  }
};

// POST /api/api-keys — crée une nouvelle clé API
// Body : { name }
const createApiKey = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Le nom de la clé est requis' });
    }
    if (name.trim().length > 100) {
      return res.status(400).json({ error: 'Le nom est trop long (max 100 caractères)' });
    }

    // Vérifier la limite de clés par utilisateur
    const count = await prisma.apiKey.count({ where: { userId: req.user.id } });
    if (count >= MAX_KEYS_PER_USER) {
      return res.status(400).json({ error: `Maximum ${MAX_KEYS_PER_USER} clés API par utilisateur` });
    }

    const key = generateApiKey();
    const apiKey = await prisma.apiKey.create({
      data: {
        userId: req.user.id,
        name: name.trim(),
        key,
      },
      select: {
        id: true,
        name: true,
        key: true, // renvoyée uniquement à la création, jamais ensuite
        createdAt: true,
        lastUsedAt: true,
      },
    });

    res.status(201).json(apiKey);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/api-keys/:id — révoque une clé API (doit appartenir à l'utilisateur connecté)
const deleteApiKey = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'id invalide' });

    const apiKey = await prisma.apiKey.findUnique({ where: { id } });
    if (!apiKey) return res.status(404).json({ error: 'Clé API introuvable' });
    if (apiKey.userId !== req.user.id) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    await prisma.apiKey.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

module.exports = { listApiKeys, createApiKey, deleteApiKey };
