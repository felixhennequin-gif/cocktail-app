const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { generateShoppingList } = require('../controllers/shopping-list-controller');

const router = Router();

router.post('/', requireAuth, generateShoppingList);

module.exports = router;
