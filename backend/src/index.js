require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const FileType = require('file-type');
const { generalLimiter, authLimiter } = require('./rateLimiter');
const { requireAuth } = require('./middleware/auth');
const prisma = require('./prisma');

const prerenderMiddleware = require('./middleware/prerender');

const recipeRoutes   = require('./routes/recipe-routes');
const categoryRoutes = require('./routes/category-routes');
const authRoutes     = require('./routes/auth-routes');
const favoriteRoutes = require('./routes/favorite-routes');
const ratingRoutes   = require('./routes/rating-routes');
const commentRoutes  = require('./routes/comment-routes');
const userRoutes     = require('./routes/user-routes');
const tagRoutes          = require('./routes/tag-routes');
const collectionRoutes   = require('./routes/collection-routes');
const feedRoutes         = require('./routes/feed-routes');
const notificationRoutes = require('./routes/notification-routes');
const challengeRoutes    = require('./routes/challenge-routes');
const techniqueRoutes    = require('./routes/technique-routes');
const articleRoutes      = require('./routes/article-routes');
const pushRoutes         = require('./routes/push-routes');
const apiKeyRoutes       = require('./routes/api-key-routes');
const apiV1Routes        = require('./routes/api-v1-routes');
const apiDocsRoutes      = require('./routes/api-docs-routes');
const ingredientRoutes   = require('./routes/ingredient-routes');
const tastingRoutes      = require('./routes/tasting-routes');
const shoppingListRoutes = require('./routes/shopping-list-routes');
const leaderboardRoutes  = require('./routes/leaderboard-routes');
const streakRoutes       = require('./routes/streak-routes');
const menuRoutes         = require('./routes/menu-routes');
const glossaryRoutes     = require('./routes/glossary-routes');
const newsletterRoutes   = require('./routes/newsletter-routes');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// Redirection www → non-www (Cloudflare Tunnel envoie les deux sur le port 3000)
app.use((req, res, next) => {
  if (req.hostname === 'www.cocktail-app.fr') {
    return res.redirect(301, `https://cocktail-app.fr${req.originalUrl}`);
  }
  next();
});

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://placehold.co", "https://*.thecocktaildb.com", "https://cocktail-app.fr"],
      connectSrc: ["'self'", "https://cocktail-app.fr", "https://*.thecocktaildb.com"],
    },
  },
}));
// CORS : origines depuis la variable d'env ou valeurs par défaut
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
  : ['http://localhost:5173', 'http://192.168.1.85:5173', 'https://cocktail-app.fr'];
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));
app.use(generalLimiter);

// Static uploads
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '7d',
  etag: true,
  lastModified: true,
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  },
}));

// Extensions et MIME types autorisés (pas de SVG — vecteur XSS)
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_EXTENSIONS  = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

const imageFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_IMAGE_TYPES.has(file.mimetype) && ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Fichier non autorisé : seuls JPEG, PNG, WebP et GIF sont acceptés'));
  }
};

// Middleware post-upload : valide les magic bytes du fichier
const validateImageMagicBytes = async (req, res, next) => {
  if (!req.file) return next();
  try {
    const type = await FileType.fromFile(req.file.path);
    if (!type || !ALLOWED_IMAGE_TYPES.has(type.mime)) {
      // Supprimer le fichier rejeté
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'Fichier rejeté : le contenu ne correspond pas à une image valide (JPEG, PNG, WebP, GIF)' });
    }
    next();
  } catch {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'Impossible de valider le fichier uploadé' });
  }
};

// Multer config — upload recette principale
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFilter });

// Multer config — upload image d'étape (sous-dossier recipes/{recipeId}/steps/)
const stepStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const recipeId = req.params.recipeId;
    // Validation : recipeId doit être un entier pour éviter le path traversal
    if (!/^\d+$/.test(recipeId)) {
      return cb(new Error('recipeId invalide'));
    }
    const dir = path.join(uploadsDir, 'recipes', recipeId, 'steps');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const uploadStep = multer({ storage: stepStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFilter });

// Router API — toutes les routes data sous /api
const apiRouter = express.Router();

apiRouter.get('/health', async (req, res) => {
  const checks = { db: false, redis: false };
  try { await prisma.$queryRaw`SELECT 1`; checks.db = true; } catch {}
  try {
    const { redis } = require('./cache');
    if (redis) { await redis.ping(); checks.redis = true; }
  } catch {}
  const ok = checks.db;
  res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'degraded', checks });
});
apiRouter.post('/upload', requireAuth, upload.single('image'), validateImageMagicBytes, (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  res.json({ url: `/uploads/${req.file.filename}` });
});
// Upload image d'étape — stockée dans uploads/recipes/{recipeId}/steps/
// Vérifie que l'utilisateur est l'auteur de la recette ou admin
apiRouter.post('/upload/step/:recipeId', requireAuth, async (req, res, next) => {
  try {
    const recipeId = parseInt(req.params.recipeId);
    if (isNaN(recipeId)) return res.status(400).json({ error: 'recipeId invalide' });

    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) return res.status(404).json({ error: 'Recette introuvable' });
    if (recipe.authorId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    next();
  } catch (err) {
    next(err);
  }
}, uploadStep.single('image'), validateImageMagicBytes, (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  const recipeId = req.params.recipeId;
  const rel = `/uploads/recipes/${recipeId}/steps/${req.file.filename}`;
  res.json({ url: rel });
});
apiRouter.use('/auth',          authRoutes);
apiRouter.use('/recipes',       recipeRoutes);
apiRouter.use('/categories',    categoryRoutes);
apiRouter.use('/favorites',     favoriteRoutes);
apiRouter.use('/ratings',       ratingRoutes);
apiRouter.use('/comments',      commentRoutes);
apiRouter.use('/users',         userRoutes);
apiRouter.use('/tags',          tagRoutes);
apiRouter.use('/collections',   collectionRoutes);
apiRouter.use('/feed',          feedRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/challenges',   challengeRoutes);
apiRouter.use('/techniques',   techniqueRoutes);
apiRouter.use('/articles',     articleRoutes);
apiRouter.use('/push',         pushRoutes);
apiRouter.use('/api-keys',     apiKeyRoutes);
apiRouter.use('/ingredients',  ingredientRoutes);
apiRouter.use('/tastings',      tastingRoutes);
apiRouter.use('/shopping-list', shoppingListRoutes);
apiRouter.use('/leaderboard',  leaderboardRoutes);
apiRouter.use('/streak',       streakRoutes);
apiRouter.use('/menus',        menuRoutes);
apiRouter.use('/glossary',     glossaryRoutes);
apiRouter.use('/newsletter',   newsletterRoutes);

// Export routes (PDF, OG image) — montées sous /api/recipes
const recipeExportRoutes = require('./routes/recipe-export-routes');
apiRouter.use('/recipes', recipeExportRoutes);

// Bar virtuel et badges
const barRoutes   = require('./routes/bar-routes');
const badgeRoutes = require('./routes/badge-routes');
apiRouter.use('/bar',    barRoutes);
apiRouter.use('/badges', badgeRoutes);

// Widget embeddable (hors /api — HTML direct)
const embedRoutes = require('./routes/embed-routes');
app.use('/embed', embedRoutes);

// API publique v1
app.use('/api/v1', apiV1Routes);

// Page de documentation API
app.use(apiDocsRoutes);

app.use('/api', apiRouter);

// Sitemap XML dynamique
const sitemapRoutes = require('./routes/sitemap-routes');
app.use(sitemapRoutes);

// Frontend production — sert le build React si le dossier dist existe
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  // sw.js → toujours no-cache pour que le navigateur détecte les mises à jour immédiatement
  app.get('/sw.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(frontendDist, 'sw.js'));
  });

  // Assets avec hash → cache long (1 an)
  app.use('/assets', express.static(path.join(frontendDist, 'assets'), {
    maxAge: '1y',
    immutable: true,
  }));
  // Autres fichiers statiques (manifest, sw.js, etc.) → cache court
  app.use(express.static(frontendDist, {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }));
  // Prerender pour les bots : sert du HTML avec meta tags OG avant le catch-all SPA
  app.use(prerenderMiddleware);

  // Catch-all pour React Router (SPA) — toujours no-cache sur index.html
  app.get(/.*/, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Gestion des erreurs globale
const logger = require('./logger');
app.use((err, req, res, next) => {
  logger.error('server', err.message, { stack: err.stack, path: req.path });
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON invalide' });
  }
  if (err.message && err.message.includes('non autorisé')) {
    return res.status(400).json({ error: 'Fichier non autorisé : images uniquement' });
  }
  res.status(err.status || 500).json({ error: 'Erreur interne du serveur' });
});

// Nettoyage périodique des refresh tokens expirés (toutes les 24h)
const { cleanupAllExpiredRefreshTokens } = require('./controllers/auth-controller');
setInterval(() => {
  cleanupAllExpiredRefreshTokens().catch((err) => {
    console.error('[cleanup] Erreur nettoyage refresh tokens:', err.message);
  });
}, 24 * 60 * 60 * 1000);

// Démarrage du serveur (uniquement si exécuté directement, pas via require)
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);

    // Ping Google pour signaler le sitemap (une seule fois au démarrage)
    const sitemapUrl = `${process.env.SITE_URL || 'https://cocktail-app.fr'}/sitemap.xml`;
    fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`)
      .then((res) => console.log(`[sitemap] Ping Google: ${res.status}`))
      .catch((err) => console.warn(`[sitemap] Ping Google échoué: ${err.message}`));
  });

  let isShuttingDown = false;
  const shutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[server] ${signal} reçu — arrêt gracieux en cours...`);

    // Timeout de sécurité : force l'arrêt après 10 secondes
    const forceTimeout = setTimeout(() => {
      console.error('[server] Arrêt forcé après timeout');
      process.exit(1);
    }, 10_000);
    forceTimeout.unref();

    try {
      // Arrêter d'accepter de nouvelles connexions et attendre les connexions en cours
      await new Promise((resolve) => server.close(resolve));
      await prisma.$disconnect();
      const { redis } = require('./cache');
      if (redis) await redis.quit();
      console.log('[server] Arrêt propre terminé');
      process.exit(0);
    } catch (err) {
      console.error('[server] Erreur lors de l\'arrêt:', err.message);
      process.exit(1);
    }
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
