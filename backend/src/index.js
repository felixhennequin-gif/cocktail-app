require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { generalLimiter, authLimiter } = require('./rateLimiter');
const { requireAuth } = require('./middleware/auth');

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

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://192.168.1.85:5173',
    'https://cocktail-app.fr',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '50kb' }));
app.use(generalLimiter);

// Static uploads
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Fichier non autorisé : images uniquement'));
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

apiRouter.get('/health', (req, res) => res.json({ status: 'ok' }));
apiRouter.post('/upload', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  res.json({ url: `/uploads/${req.file.filename}` });
});
// Upload image d'étape — stockée dans uploads/recipes/{recipeId}/steps/
apiRouter.post('/upload/step/:recipeId', requireAuth, uploadStep.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  const recipeId = req.params.recipeId;
  const rel = `/uploads/recipes/${recipeId}/steps/${req.file.filename}`;
  res.json({ url: rel });
});
apiRouter.use('/auth/login',    authLimiter);
apiRouter.use('/auth/register', authLimiter);
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

app.use('/api', apiRouter);

// Frontend production — sert le build React si le dossier dist existe
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
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
  // Catch-all pour React Router (SPA) — toujours no-cache sur index.html
  app.get(/.*/, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Gestion des erreurs globale
app.use((err, req, res, next) => {
  console.error(err);
  if (err.message && err.message.includes('non autorisé')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// Démarrage du serveur (uniquement si exécuté directement, pas via require)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
  });
}

module.exports = app;
