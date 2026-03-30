const { Router } = require('express');
const { getAllRecipes, getRecipeById, getSeasonalRecipes, createRecipe, updateRecipe, deleteRecipe, publishRecipe, unpublishRecipe } = require('../controllers/recipe-controller');
const { getDailyRecipe } = require('../controllers/daily-controller');
const { getRecommendedRecipes } = require('../controllers/recommendation-controller');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');
const { cacheMiddleware } = require('../cache');

const router = Router();

router.get('/',           optionalAuth, cacheMiddleware(60),  getAllRecipes);
router.get('/daily',      optionalAuth, getDailyRecipe); // cache géré manuellement dans le controller
router.get('/seasonal',   optionalAuth, cacheMiddleware(3600), getSeasonalRecipes); // cache 1h
router.get('/recommended', requireAuth, getRecommendedRecipes);
router.get('/:id',        optionalAuth, getRecipeById);
router.post('/',         requireAuth,  createRecipe);
router.put('/:id',       requireAuth,  updateRecipe);
router.delete('/:id',    requireAuth,  deleteRecipe);
router.patch('/:id/publish',   requireAuth, requireAdmin, publishRecipe);
router.patch('/:id/unpublish', requireAuth, unpublishRecipe);

module.exports = router;
