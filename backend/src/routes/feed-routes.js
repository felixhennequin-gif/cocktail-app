const { Router } = require('express');
const { getFeed } = require('../controllers/feed-controller');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.get('/', requireAuth, getFeed);

module.exports = router;
