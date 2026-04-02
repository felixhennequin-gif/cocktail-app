const { Router } = require('express');
const { getAllTags, getTagByName } = require('../controllers/tag-controller');
const { cacheMiddleware } = require('../cache');

const router = Router();

router.get('/', cacheMiddleware(120), getAllTags);
router.get('/:name', cacheMiddleware(120), getTagByName);

module.exports = router;
