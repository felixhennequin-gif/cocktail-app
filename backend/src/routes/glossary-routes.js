const { Router } = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { cacheMiddleware } = require('../cache');
const { getGlossary, getGlossaryEntry, createGlossaryEntry } = require('../controllers/glossary-controller');

const router = Router();

router.get('/',      cacheMiddleware(3600), getGlossary);
router.get('/:slug', cacheMiddleware(3600), getGlossaryEntry);
router.post('/',     requireAuth, requireAdmin, createGlossaryEntry);

module.exports = router;
