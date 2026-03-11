const express = require('express');
const router = express.Router();
const { getComments, createComment, deleteComment } = require('../controllers/comment-controller');
const { requireAuth } = require('../middleware/auth');

router.get('/:recipeId',  getComments);
router.post('/:recipeId', requireAuth, createComment);
router.delete('/:id',     requireAuth, deleteComment);

module.exports = router;
