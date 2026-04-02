const { Router } = require('express');
const { requireAdmin, optionalAuth } = require('../middleware/auth');
const { cacheMiddleware } = require('../cache');
const {
  getArticles,
  getArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle,
} = require('../controllers/article-controller');

const router = Router();

// Routes publiques (cache 60s)
router.get('/',      cacheMiddleware(60), getArticles);
router.get('/:slug', optionalAuth,        getArticleBySlug);

// Routes admin uniquement
router.post('/',       requireAdmin, createArticle);
router.put('/:slug',   requireAdmin, updateArticle);
router.delete('/:slug', requireAdmin, deleteArticle);

module.exports = router;
