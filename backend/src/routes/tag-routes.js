const { Router } = require('express');
const { getAllTags } = require('../controllers/tag-controller');
const { cacheMiddleware } = require('../cache');

const router = Router();

router.get('/', cacheMiddleware(120), getAllTags);

module.exports = router;
