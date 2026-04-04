const express = require('express');
const router = express.Router();
const { updateMyProfile, getUserProfile, getUserRecipes, updateUserPlan, getUserStats } = require('../controllers/user-controller');
const { getMyPreferences, upsertMyPreferences } = require('../controllers/preference-controller');
const { followUser, unfollowUser, getFollowers, getFollowing } = require('../controllers/follow-controller');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');
const { cacheMiddleware } = require('../cache');

// Route statique avant les routes dynamiques /:id
router.put('/me', requireAuth, updateMyProfile);

// Préférences gustatives
router.get('/me/preferences',  requireAuth, getMyPreferences);
router.put('/me/preferences',  requireAuth, upsertMyPreferences);

// Admin — gestion des plans
router.patch('/admin/:id/plan', requireAuth, requireAdmin, updateUserPlan);

// Stats must be BEFORE /:id catch-all
router.get('/:id/stats',           optionalAuth, cacheMiddleware(60), getUserStats);
router.get('/:id',              optionalAuth, getUserProfile);
router.get('/:id/recipes',      getUserRecipes);
router.get('/:id/followers',    optionalAuth, getFollowers);
router.get('/:id/following',    optionalAuth, getFollowing);
router.post('/:id/follow',      requireAuth,  followUser);
router.delete('/:id/follow',    requireAuth,  unfollowUser);

module.exports = router;
