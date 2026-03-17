const { Router } = require('express');
const { getNotifications, markAllRead, markOneRead } = require('../controllers/notification-controller');
const { requireAuth } = require('../middleware/auth');
const { pollingLimiter } = require('../rateLimiter');

const router = Router();

router.get('/',              requireAuth, pollingLimiter, getNotifications);
router.put('/read-all',      requireAuth, markAllRead);
router.put('/:id/read',      requireAuth, markOneRead);

module.exports = router;
