const { Router } = require('express');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');
const { cacheMiddleware } = require('../cache');
const {
  getChallenges,
  getCurrentChallenge,
  getChallengeById,
  enterChallenge,
  createChallenge,
} = require('../controllers/challenge-controller');

const router = Router();

// Routes publiques (avec cache)
router.get('/',        cacheMiddleware(120), getChallenges);
router.get('/current', cacheMiddleware(120), getCurrentChallenge);
router.get('/:id',     optionalAuth, getChallengeById);

// Routes authentifiées
router.post('/:id/enter', requireAuth, enterChallenge);

// Routes admin
router.post('/', requireAdmin, createChallenge);

module.exports = router;
