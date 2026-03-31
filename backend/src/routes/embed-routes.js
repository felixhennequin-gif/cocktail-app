const { Router } = require('express');
const { cacheMiddleware } = require('../cache');
const { getRecipeEmbed } = require('../controllers/embed-controller');

const router = Router();

router.get('/recipes/:id', cacheMiddleware(3600), getRecipeEmbed);

module.exports = router;
