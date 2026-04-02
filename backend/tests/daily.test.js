const request = require('supertest');
const app     = require('../src/index');
const { cleanDb, createTestCategory, createTestRecipe } = require('./helpers');

let category;

beforeEach(async () => {
  await cleanDb();
  category = await createTestCategory();
  for (let i = 1; i <= 5; i++) {
    await createTestRecipe({ categoryId: category.id, name: `Cocktail ${i}` });
  }
});

describe('GET /api/recipes/daily', () => {
  it('retourne 200 avec une recette publiée', async () => {
    const res = await request(app).get('/api/recipes/daily');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('name');
    expect(res.body).toHaveProperty('avgRating');
  });

  it('retourne la même recette pour deux appels le même jour', async () => {
    const res1 = await request(app).get('/api/recipes/daily');
    const res2 = await request(app).get('/api/recipes/daily');
    expect(res1.body.id).toBe(res2.body.id);
  });

  it('retourne 404 si aucune recette publiée', async () => {
    const prisma = require('../src/prisma');
    // Supprimer toutes les recettes d'abord (dépendances)
    await prisma.recipeIngredient.deleteMany();
    await prisma.step.deleteMany();
    await prisma.recipeTag.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.rating.deleteMany();
    await prisma.favorite.deleteMany();
    await prisma.collectionRecipe.deleteMany();
    await prisma.recipe.deleteMany();
    const res = await request(app).get('/api/recipes/daily');
    expect(res.status).toBe(404);
  });
});
