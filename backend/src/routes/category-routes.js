const { Router } = require('express');
const { getAllCategories, getCategoryBySlug } = require('../controllers/category-controller');
const { cacheMiddleware } = require('../cache');

const router = Router();

router.get('/', cacheMiddleware(300), getAllCategories);
router.get('/:slug', cacheMiddleware(300), getCategoryBySlug);

module.exports = router;
