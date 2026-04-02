// Source de vérité unique pour les limites par plan
const PLAN_LIMITS = {
  FREE: {
    maxFavorites: 30,
    maxCollections: 3,
    maxRecipesPerCollection: 20,
    maxFollowing: 50,
    maxRecipesSubmitted: 5,
    maxBarIngredients: 15,
    maxMakeableResults: 5,
    maxRecommendationsPerDay: 3,
    canExportPdf: false,
    canAccessTasteProfile: false,
    hideSponsoredRecipes: false,
    maxApiKeys: 1,
    apiRatePerHour: 100,
  },
  PREMIUM: {
    maxFavorites: Infinity,
    maxCollections: Infinity,
    maxRecipesPerCollection: 100,
    maxFollowing: Infinity,
    maxRecipesSubmitted: Infinity,
    maxBarIngredients: Infinity,
    maxMakeableResults: Infinity,
    maxRecommendationsPerDay: Infinity,
    canExportPdf: true,
    canAccessTasteProfile: true,
    hideSponsoredRecipes: true,
    maxApiKeys: 5,
    apiRatePerHour: 1000,
  },
};

// Helper : récupérer les limites du plan d'un user
const getLimits = (plan) => PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;

module.exports = { PLAN_LIMITS, getLimits };
