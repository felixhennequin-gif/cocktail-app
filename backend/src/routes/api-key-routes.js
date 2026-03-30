const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { listApiKeys, createApiKey, deleteApiKey } = require('../controllers/api-key-controller');

const router = Router();

// Toutes les routes nécessitent une authentification JWT
router.get('/',    requireAuth, listApiKeys);
router.post('/',   requireAuth, createApiKey);
router.delete('/:id', requireAuth, deleteApiKey);

module.exports = router;
