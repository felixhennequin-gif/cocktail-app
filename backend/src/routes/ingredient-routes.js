// Routes ingrédients — liste publique (GET) + mise à jour lien affilié (PATCH, admin)
const { Router } = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { cacheMiddleware } = require('../cache');
const { getAllIngredients, updateIngredient } = require('../controllers/ingredient-controller');

const router = Router();

// Liste publique — mise en cache 120s (même TTL que les tags)
router.get('/', cacheMiddleware(120), getAllIngredients);

// Mise à jour lien affilié — réservé aux admins
router.patch('/:id', requireAuth, requireAdmin, updateIngredient);

module.exports = router;
