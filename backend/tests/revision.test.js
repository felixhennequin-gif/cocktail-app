const request = require('supertest');
const app = require('../src/index');
const prisma = require('../src/prisma');
const { cleanDb, createTestUser, createTestCategory, createTestRecipe, getAuthHeader } = require('./helpers');

let alice, aliceToken, bob, bobToken;
let category, recipe;

beforeEach(async () => {
  await cleanDb();
  ({ user: alice, token: aliceToken } = await createTestUser({ pseudo: 'alice', email: 'alice@test.com' }));
  ({ user: bob, token: bobToken } = await createTestUser({ pseudo: 'bob', email: 'bob@test.com' }));
  category = await createTestCategory();
  recipe = await createTestRecipe({ authorId: alice.id, categoryId: category.id });

  // Créer des révisions
  await prisma.recipeRevision.create({
    data: {
      recipeId: recipe.id,
      version: 1,
      data: { name: recipe.name, difficulty: 'EASY' },
      authorId: alice.id,
      message: 'Version initiale',
    },
  });
  await prisma.recipeRevision.create({
    data: {
      recipeId: recipe.id,
      version: 2,
      data: { name: recipe.name, difficulty: 'MEDIUM' },
      authorId: alice.id,
      message: 'Augmentation difficulté',
    },
  });
});

describe('Recipe Revisions (Historique des versions)', () => {

  describe('GET /api/recipes/:id/history', () => {
    it('retourne l\'historique des révisions', async () => {
      const res = await request(app)
        .get(`/api/recipes/${recipe.id}/history`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('revisions');
      expect(res.body.revisions.length).toBe(2);
      expect(res.body).toHaveProperty('count', 2);
    });

    it('retourne 404 pour une recette inexistante', async () => {
      const res = await request(app).get('/api/recipes/99999/history');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/recipes/:id/revisions/:version', () => {
    it('retourne une version spécifique', async () => {
      const res = await request(app)
        .get(`/api/recipes/${recipe.id}/revisions/1`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('version', 1);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('message', 'Version initiale');
    });

    it('retourne 404 pour une version inexistante', async () => {
      const res = await request(app)
        .get(`/api/recipes/${recipe.id}/revisions/99`);

      expect(res.status).toBe(404);
    });
  });
});
