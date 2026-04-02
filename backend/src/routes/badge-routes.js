// Routes des badges
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getAllBadges, getMyBadges, getUserBadges } = require('../controllers/badge-controller');

// GET /badges — liste tous les badges
router.get('/', getAllBadges);

// GET /badges/me — badges de l'utilisateur connecté
router.get('/me', requireAuth, getMyBadges);

// GET /badges/user/:userId — badges d'un utilisateur
router.get('/user/:userId', getUserBadges);

module.exports = router;
