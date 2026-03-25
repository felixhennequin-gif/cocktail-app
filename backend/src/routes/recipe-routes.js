const { Router } = require('express');
const { getAllRecipes, getRecipeById, createRecipe, updateRecipe, deleteRecipe, publishRecipe, unpublishRecipe } = require('../controllers/recipe-controller');
const { getDailyRecipe } = require('../controllers/daily-controller');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');
const { cacheMiddleware } = require('../cache');

const router = Router();

router.get('/',          optionalAuth, cacheMiddleware(60),  getAllRecipes);
router.get('/daily',     optionalAuth, cacheMiddleware(300), getDailyRecipe); // avant /:id
router.get('/:id',       optionalAuth, cacheMiddleware(120), getRecipeById);
router.post('/',         requireAuth,  createRecipe);
router.put('/:id',       requireAuth,  updateRecipe);
router.delete('/:id',    requireAuth,  deleteRecipe);
router.patch('/:id/publish',   requireAuth, requireAdmin, publishRecipe);
router.patch('/:id/unpublish', requireAuth, unpublishRecipe);

module.exports = router;
