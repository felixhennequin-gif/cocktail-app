// Service de gestion du cache lié aux recettes
const { invalidateCacheByPattern, invalidateCache } = require('../cache');

// Invalide uniquement les entrées de cache liées aux recettes et au daily (pas les catégories ni les tags)
const bustRecipeCache = (recipeId) => {
  const promises = [
    invalidateCacheByPattern('cocktail:/api/recipes*'),
    invalidateCache('cocktail:daily-recipe'),
  ];
  if (recipeId) {
    promises.push(invalidateCache(`cocktail:/api/recipes/${recipeId}`));
  }
  return Promise.all(promises).catch(() => {});
};

module.exports = { bustRecipeCache };
