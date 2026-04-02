const express = require('express');
const router = express.Router();
const { addFavorite, removeFavorite, getMyFavorites } = require('../controllers/favorite-controller');
const { requireAuth } = require('../middleware/auth');

router.get('/',             requireAuth, getMyFavorites);
router.post('/:recipeId',   requireAuth, addFavorite);
router.delete('/:recipeId', requireAuth, removeFavorite);

module.exports = router;
