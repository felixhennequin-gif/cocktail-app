const { Router } = require('express');
const { apiKeyMiddleware } = require('../middleware/api-key');
const { cacheMiddleware } = require('../cache');
const { apiV1AnonLimiter, apiV1KeyLimiter } = require('../rateLimiter');
const { getAllRecipes, getRecipeById } = require('../controllers/recipe-controller');
const { getAllCategories } = require('../controllers/category-controller');
const { getAllTags } = require('../controllers/tag-controller');
const prisma = require('../prisma');

const router = Router();

// Applique la vérification de clé API en amont de toutes les routes v1
// puis les deux limiteurs (l'un s'active selon la présence de req.apiKeyUser)
router.use(apiKeyMiddleware);
router.use(apiV1AnonLimiter);
router.use(apiV1KeyLimiter);

// GET /api/v1/recipes — liste paginée des recettes publiées
router.get('/recipes',     cacheMiddleware(60),  getAllRecipes);

// GET /api/v1/recipes/:id — détail d'une recette
router.get('/recipes/:id', getRecipeById);

// GET /api/v1/categories — liste des catégories
router.get('/categories',  cacheMiddleware(300), getAllCategories);

// GET /api/v1/tags — liste des tags triés par popularité
router.get('/tags',        cacheMiddleware(120), getAllTags);

// GET /api/v1/ingredients — liste de tous les ingrédients
router.get('/ingredients', cacheMiddleware(300), async (req, res, next) => {
  try {
    const { q } = req.query;
    const where = q ? { name: { contains: q, mode: 'insensitive' } } : {};
    const ingredients = await prisma.ingredient.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 200,
      select: { id: true, name: true },
    });
    res.json(ingredients);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
