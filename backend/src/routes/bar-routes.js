const express = require('express');
const router = express.Router();
const { getMyBar, updateMyBar, getMakeableRecipes, searchIngredients } = require('../controllers/bar-controller');
const { requireAuth } = require('../middleware/auth');

// Recherche d'ingrédients (pas besoin d'auth — pour l'autocomplete)
router.get('/ingredients', searchIngredients);

router.get('/',         requireAuth, getMyBar);
router.put('/',         requireAuth, updateMyBar);
router.get('/makeable', requireAuth, getMakeableRecipes);

module.exports = router;
