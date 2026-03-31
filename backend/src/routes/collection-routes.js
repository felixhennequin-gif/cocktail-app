const { Router } = require('express');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { cacheMiddleware } = require('../cache');
const {
  createCollection,
  getMyCollections,
  getCollectionById,
  updateCollection,
  deleteCollection,
  addRecipeToCollection,
  removeRecipeFromCollection,
} = require('../controllers/collection-controller');
const { getCuratedCollections, getCuratedCollectionDetail } = require('../controllers/curated-controller');

const router = Router();

router.get('/curated',                 cacheMiddleware(3600), getCuratedCollections);
router.get('/curated/:id',            optionalAuth, cacheMiddleware(300), getCuratedCollectionDetail);
router.post('/',                       requireAuth, createCollection);
router.get('/me',                      requireAuth, getMyCollections);
router.get('/:id',                     optionalAuth, getCollectionById);
router.put('/:id',                     requireAuth, updateCollection);
router.delete('/:id',                  requireAuth, deleteCollection);
router.post('/:id/recipes',           requireAuth, addRecipeToCollection);
router.delete('/:id/recipes/:recipeId', requireAuth, removeRecipeFromCollection);

module.exports = router;
