const express = require('express');
const router = express.Router();
const { updateMyProfile, getUserProfile, getUserRecipes } = require('../controllers/user-controller');
const { followUser, unfollowUser, getFollowers, getFollowing } = require('../controllers/follow-controller');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// Route statique avant les routes dynamiques /:id
router.put('/me', requireAuth, updateMyProfile);

router.get('/:id',              optionalAuth, getUserProfile);
router.get('/:id/recipes',      getUserRecipes);
router.get('/:id/followers',    optionalAuth, getFollowers);
router.get('/:id/following',    optionalAuth, getFollowing);
router.post('/:id/follow',      requireAuth,  followUser);
router.delete('/:id/follow',    requireAuth,  unfollowUser);

module.exports = router;
