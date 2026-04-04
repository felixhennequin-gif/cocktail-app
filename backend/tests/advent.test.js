const request = require('supertest');
const app = require('../src/index');
const { cleanDb, createTestUser, createTestCategory, createTestRecipe } = require('./helpers');

beforeEach(async () => {
  await cleanDb();
  const { user } = await createTestUser({ pseudo: 'alice', email: 'alice@test.com' });
  const category = await createTestCategory();
  // Créer au moins 24 recettes pour le calendrier
  for (let i = 1; i <= 25; i++) {
    await createTestRecipe({ authorId: user.id, categoryId: category.id, name: `Cocktail ${i}` });
  }
});

describe('Advent Calendar (Calendrier de l\'avent)', () => {

  describe('GET /api/recipes/advent', () => {
    it('retourne une réponse valide', async () => {
      const res = await request(app).get('/api/recipes/advent');

      expect(res.status).toBe(200);
      // En décembre : available true + year + days
      // Hors décembre : available false + message
      if (new Date().getMonth() === 11) {
        expect(res.body.available).toBe(true);
        expect(res.body).toHaveProperty('year');
        expect(res.body).toHaveProperty('days');
      } else {
        expect(res.body.available).toBe(false);
        expect(res.body).toHaveProperty('message');
      }
    });

    it('fonctionne sans authentification', async () => {
      const res = await request(app).get('/api/recipes/advent');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/recipes/advent/:day', () => {
    it('rejette un jour hors limites (0)', async () => {
      const res = await request(app).get('/api/recipes/advent/0');
      expect(res.status).toBe(400);
    });

    it('rejette un jour hors limites (25)', async () => {
      const res = await request(app).get('/api/recipes/advent/25');
      expect(res.status).toBe(400);
    });

    it('retourne une réponse pour un jour valide (1-24)', async () => {
      const res = await request(app).get('/api/recipes/advent/1');
      expect(res.status).toBe(200);
      // Hors décembre : available false
      if (new Date().getMonth() !== 11) {
        expect(res.body.available).toBe(false);
      }
    });
  });
});
