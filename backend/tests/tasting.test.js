const request = require('supertest');
const app = require('../src/index');
const { cleanDb, createTestUser, createTestCategory, createTestRecipe, getAuthHeader } = require('./helpers');

let alice, aliceToken, bob, bobToken;
let category, recipe;

beforeEach(async () => {
  await cleanDb();
  ({ user: alice, token: aliceToken } = await createTestUser({ pseudo: 'alice', email: 'alice@test.com' }));
  ({ user: bob, token: bobToken } = await createTestUser({ pseudo: 'bob', email: 'bob@test.com' }));
  category = await createTestCategory();
  recipe = await createTestRecipe({ authorId: alice.id, categoryId: category.id });
});

describe('Tastings (Journal de dégustation)', () => {

  describe('POST /api/tastings', () => {
    it('crée une dégustation', async () => {
      const res = await request(app)
        .post('/api/tastings')
        .set(getAuthHeader(aliceToken))
        .send({ recipeId: recipe.id, notes: 'Excellent !', personalRating: 5 });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.notes).toBe('Excellent !');
      expect(res.body.personalRating).toBe(5);
    });

    it('crée une dégustation minimale (recipeId seul)', async () => {
      const res = await request(app)
        .post('/api/tastings')
        .set(getAuthHeader(aliceToken))
        .send({ recipeId: recipe.id });

      expect(res.status).toBe(201);
    });

    it('refuse sans authentification', async () => {
      const res = await request(app)
        .post('/api/tastings')
        .send({ recipeId: recipe.id });

      expect(res.status).toBe(401);
    });

    it('refuse un recipeId inexistant', async () => {
      const res = await request(app)
        .post('/api/tastings')
        .set(getAuthHeader(aliceToken))
        .send({ recipeId: 99999 });

      expect(res.status).toBe(404);
    });

    it('refuse un personalRating hors limites', async () => {
      const res = await request(app)
        .post('/api/tastings')
        .set(getAuthHeader(aliceToken))
        .send({ recipeId: recipe.id, personalRating: 10 });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/tastings', () => {
    it('retourne les dégustations paginées', async () => {
      // Créer 2 dégustations
      await request(app).post('/api/tastings').set(getAuthHeader(aliceToken)).send({ recipeId: recipe.id, notes: 'Test 1' });
      await request(app).post('/api/tastings').set(getAuthHeader(aliceToken)).send({ recipeId: recipe.id, notes: 'Test 2' });

      const res = await request(app)
        .get('/api/tastings')
        .set(getAuthHeader(aliceToken));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(res.body.data.length).toBe(2);
    });

    it('ne retourne que les dégustations du user connecté', async () => {
      await request(app).post('/api/tastings').set(getAuthHeader(aliceToken)).send({ recipeId: recipe.id });
      await request(app).post('/api/tastings').set(getAuthHeader(bobToken)).send({ recipeId: recipe.id });

      const res = await request(app)
        .get('/api/tastings')
        .set(getAuthHeader(aliceToken));

      expect(res.body.total).toBe(1);
    });

    it('refuse sans authentification', async () => {
      const res = await request(app).get('/api/tastings');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/tastings/stats', () => {
    it('retourne les statistiques', async () => {
      await request(app).post('/api/tastings').set(getAuthHeader(aliceToken)).send({ recipeId: recipe.id, personalRating: 4 });

      const res = await request(app)
        .get('/api/tastings/stats')
        .set(getAuthHeader(aliceToken));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body.total).toBe(1);
    });
  });

  describe('DELETE /api/tastings/:id', () => {
    it('supprime sa propre dégustation', async () => {
      const create = await request(app)
        .post('/api/tastings')
        .set(getAuthHeader(aliceToken))
        .send({ recipeId: recipe.id });

      const res = await request(app)
        .delete(`/api/tastings/${create.body.id}`)
        .set(getAuthHeader(aliceToken));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('refuse de supprimer la dégustation d\'un autre user', async () => {
      const create = await request(app)
        .post('/api/tastings')
        .set(getAuthHeader(aliceToken))
        .send({ recipeId: recipe.id });

      const res = await request(app)
        .delete(`/api/tastings/${create.body.id}`)
        .set(getAuthHeader(bobToken));

      expect(res.status).toBe(403);
    });
  });
});
