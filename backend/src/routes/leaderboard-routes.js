const { Router } = require('express');
const { optionalAuth } = require('../middleware/auth');
const { cacheMiddleware } = require('../cache');
const { getLeaderboard } = require('../controllers/leaderboard-controller');

const router = Router();

router.get('/', optionalAuth, cacheMiddleware(3600), getLeaderboard);

module.exports = router;
