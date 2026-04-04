const request = require('supertest');
const app = require('../src/index');
const prisma = require('../src/prisma');
const { cleanDb, createTestUser, createTestCategory, createTestRecipe, getAuthHeader } = require('./helpers');

let alice, aliceToken;
let category, recipe1, recipe2;

beforeEach(async () => {
  await cleanDb();
  ({ user: alice, token: aliceToken } = await createTestUser({ pseudo: 'alice', email: 'alice@test.com' }));
  category = await createTestCategory();
  recipe1 = await createTestRecipe({ authorId: alice.id, categoryId: category.id, name: 'Mojito' });
  recipe2 = await createTestRecipe({ authorId: alice.id, categoryId: category.id, name: 'Daiquiri' });

  // Ajouter des ingrédients aux recettes
  const lime = await prisma.ingredient.create({ data: { name: 'Citron vert' } });
  const rum = await prisma.ingredient.create({ data: { name: 'Rhum blanc' } });
  const sugar = await prisma.ingredient.create({ data: { name: 'Sucre' } });

  await prisma.recipeIngredient.createMany({
    data: [
      { recipeId: recipe1.id, ingredientId: lime.id, quantity: 1, unit: 'pièce' },
      { recipeId: recipe1.id, ingredientId: rum.id, quantity: 6, unit: 'cl' },
      { recipeId: recipe2.id, ingredientId: lime.id, quantity: 2, unit: 'pièce' },
      { recipeId: recipe2.id, ingredientId: rum.id, quantity: 4, unit: 'cl' },
      { recipeId: recipe2.id, ingredientId: sugar.id, quantity: 2, unit: 'cl' },
    ],
  });
});

describe('Shopping List (Liste de courses)', () => {

  describe('POST /api/shopping-list', () => {
    it('génère une liste de courses consolidée', async () => {
      const res = await request(app)
        .post('/api/shopping-list')
        .set(getAuthHeader(aliceToken))
        .send({ recipeIds: [recipe1.id, recipe2.id] });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('totalItems');
      expect(res.body.items.length).toBeGreaterThanOrEqual(2);
      // Citron vert apparaît dans les 2 recettes, doit être consolidé
      const lime = res.body.items.find(i => i.name === 'Citron vert');
      expect(lime).toBeTruthy();
    });

    it('refuse sans auth', async () => {
      const res = await request(app)
        .post('/api/shopping-list')
        .send({ recipeIds: [recipe1.id] });

      expect(res.status).toBe(401);
    });

    it('refuse une liste vide', async () => {
      const res = await request(app)
        .post('/api/shopping-list')
        .set(getAuthHeader(aliceToken))
        .send({ recipeIds: [] });

      expect(res.status).toBe(400);
    });

    it('refuse plus de 20 recettes', async () => {
      const ids = Array.from({ length: 21 }, (_, i) => i + 1);
      const res = await request(app)
        .post('/api/shopping-list')
        .set(getAuthHeader(aliceToken))
        .send({ recipeIds: ids });

      expect(res.status).toBe(400);
    });
  });
});
