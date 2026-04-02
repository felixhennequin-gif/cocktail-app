const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '..', process.env.NODE_ENV === 'development' ? '.env.development' : '.env')
});
const express = require('express');
const cors = require('cors');
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
app.use(cors());
app.use(express.json());
app.use(generalLimiter);

// Compatibilité frontend production : /api/... → /...
// Le proxy Vite retire /api en dev — Express le fait ici en prod
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    req.url = req.url.slice(4);
  }
  next();
});

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

// Routes
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  res.json({ url: `/uploads/${req.file.filename}` });
});
// Upload image d'étape — stockée dans uploads/recipes/{recipeId}/steps/
app.post('/upload/step/:recipeId', requireAuth, uploadStep.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  const recipeId = req.params.recipeId;
  const rel = `/uploads/recipes/${recipeId}/steps/${req.file.filename}`;
  res.json({ url: rel });
});
app.use('/auth/login',    authLimiter);
app.use('/auth/register', authLimiter);
app.use('/auth',          authRoutes);
app.use('/recipes',    recipeRoutes);
app.use('/categories', categoryRoutes);
app.use('/favorites',  favoriteRoutes);
app.use('/ratings',    ratingRoutes);
app.use('/comments',   commentRoutes);
app.use('/users',      userRoutes);
app.use('/tags',       tagRoutes);
app.use('/collections', collectionRoutes);
app.use('/feed',           feedRoutes);
app.use('/notifications',  notificationRoutes);

// Frontend production — sert le build React si le dossier dist existe
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // Catch-all pour React Router (SPA) — regex compatible Express 5
  app.get(/.*/, (req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
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
