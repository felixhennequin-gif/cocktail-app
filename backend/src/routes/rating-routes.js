const express = require('express');
const router = express.Router();
const { upsertRating, getMyRating } = require('../controllers/rating-controller');
const { requireAuth } = require('../middleware/auth');

router.post('/:recipeId',    requireAuth, upsertRating);
router.get('/:recipeId/me', requireAuth, getMyRating);

module.exports = router;
