const express = require('express');
const router = express.Router();
const { getComments, createComment, updateComment, deleteComment } = require('../controllers/comment-controller');
const { requireAuth, optionalAuth } = require('../middleware/auth');

router.get('/:recipeId',  optionalAuth, getComments);
router.post('/:recipeId', requireAuth,  createComment);
router.put('/:id',        requireAuth,  updateComment);
router.delete('/:id',     requireAuth,  deleteComment);

module.exports = router;
