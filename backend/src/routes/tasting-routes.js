const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { cacheMiddleware } = require('../cache');
const {
  createTasting,
  getMyTastings,
  getTastingStats,
  deleteTasting,
} = require('../controllers/tasting-controller');

const router = Router();

// Toutes les routes sont authentifiées (journal personnel)
router.post('/',       requireAuth, createTasting);
router.get('/',        requireAuth, cacheMiddleware(30), getMyTastings);
router.get('/stats',   requireAuth, cacheMiddleware(60), getTastingStats);
router.delete('/:id',  requireAuth, deleteTasting);

module.exports = router;
