require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const recipeRoutes   = require('./routes/recipe-routes');
const categoryRoutes = require('./routes/category-routes');
const authRoutes     = require('./routes/auth-routes');
const favoriteRoutes = require('./routes/favorite-routes');
const ratingRoutes   = require('./routes/rating-routes');
const commentRoutes  = require('./routes/comment-routes');
const userRoutes     = require('./routes/user-routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Static uploads
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Multer config
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Fichier non autorisé : images uniquement'));
  },
});

// Routes
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  res.json({ url: `/uploads/${req.file.filename}` });
});
app.use('/auth',       authRoutes);
app.use('/recipes',    recipeRoutes);
app.use('/categories', categoryRoutes);
app.use('/favorites',  favoriteRoutes);
app.use('/ratings',    ratingRoutes);
app.use('/comments',   commentRoutes);
app.use('/users',      userRoutes);

// Gestion des erreurs globale
app.use((err, req, res, next) => {
  console.error(err);
  if (err.message && err.message.includes('non autorisé')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
