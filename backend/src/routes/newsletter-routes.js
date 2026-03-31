const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { subscribe, unsubscribe, unsubscribeByToken, getStatus } = require('../controllers/newsletter-controller');

const router = Router();

router.get('/status',           requireAuth, getStatus);
router.post('/subscribe',       requireAuth, subscribe);
router.delete('/subscribe',     requireAuth, unsubscribe);
router.get('/unsubscribe/:token', unsubscribeByToken);

module.exports = router;
