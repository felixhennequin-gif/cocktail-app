const { Router } = require('express');
const { subscribePush, unsubscribePush, getVapidKey } = require('../controllers/push-controller');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// Clé publique VAPID — publique, pas d'auth requise
router.get('/vapid-key', getVapidKey);

// Enregistrer une subscription push pour l'utilisateur connecté
router.post('/subscribe', requireAuth, subscribePush);

// Supprimer une subscription push (désabonnement)
router.delete('/subscribe', requireAuth, unsubscribePush);

module.exports = router;
