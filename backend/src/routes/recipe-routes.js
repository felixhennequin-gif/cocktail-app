const { Router } = require('express');
const { getAllRecipes, getRecipeById, createRecipe, updateRecipe, deleteRecipe } = require('../controllers/recipe-controller');

const router = Router();

router.get('/', getAllRecipes);
router.get('/:id', getRecipeById);
router.post('/', createRecipe);
router.put('/:id', updateRecipe);
router.delete('/:id', deleteRecipe);

module.exports = router;
