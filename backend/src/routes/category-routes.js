const { Router } = require('express');
const { getAllCategories } = require('../controllers/category-controller');
const { cacheMiddleware } = require('../cache');

const router = Router();

router.get('/', cacheMiddleware(300), getAllCategories);

module.exports = router;
