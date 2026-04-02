const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { generateMenu } = require('../controllers/menu-controller');

const router = Router();

router.post('/generate', requireAuth, generateMenu);

module.exports = router;
