const { Router } = require('express');
const { requireAdmin } = require('../middleware/auth');
const { cacheMiddleware } = require('../cache');
const {
  getTechniques,
  getTechniqueBySlug,
  createTechnique,
  updateTechnique,
} = require('../controllers/technique-controller');

const router = Router();

// Routes publiques (avec cache)
router.get('/',      cacheMiddleware(300), getTechniques);
router.get('/:slug', getTechniqueBySlug);

// Routes admin
router.post('/',      requireAdmin, createTechnique);
router.put('/:slug',  requireAdmin, updateTechnique);

module.exports = router;
