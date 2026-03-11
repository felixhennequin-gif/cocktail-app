const express = require('express');
const router = express.Router();
const { toggleFavorite, getMyFavorites } = require('../controllers/favorite-controller');
const { requireAuth } = require('../middleware/auth');

router.get('/',          requireAuth, getMyFavorites);
router.post('/:recipeId', requireAuth, toggleFavorite);

module.exports = router;
