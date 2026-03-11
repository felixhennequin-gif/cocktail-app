const { Router } = require('express');
const { getAllRecipes, getRecipeById, createRecipe, updateRecipe, deleteRecipe, publishRecipe } = require('../controllers/recipe-controller');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');

const router = Router();

router.get('/',          optionalAuth, getAllRecipes);
router.get('/:id',       optionalAuth, getRecipeById);
router.post('/',         requireAuth,  createRecipe);
router.put('/:id',       requireAuth,  updateRecipe);
router.delete('/:id',    requireAuth,  deleteRecipe);
router.patch('/:id/publish', requireAuth, requireAdmin, publishRecipe);

module.exports = router;
