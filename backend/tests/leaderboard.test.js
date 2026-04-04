const request = require('supertest');
const app = require('../src/index');
const { cleanDb, createTestUser, createTestCategory, createTestRecipe } = require('./helpers');

let alice;

beforeEach(async () => {
  await cleanDb();
  ({ user: alice } = await createTestUser({ pseudo: 'alice', email: 'alice@test.com' }));
  // Créer une recette pour que alice ait des stats
  const category = await createTestCategory();
  await createTestRecipe({ authorId: alice.id, categoryId: category.id });
});

describe('Leaderboard (Classement)', () => {

  describe('GET /api/leaderboard', () => {
    it('retourne le classement par défaut (recipes)', async () => {
      const res = await request(app).get('/api/leaderboard');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('category');
      expect(res.body).toHaveProperty('rankings');
      expect(Array.isArray(res.body.rankings)).toBe(true);
    });

    it('filtre par catégorie', async () => {
      const res = await request(app).get('/api/leaderboard?category=recipes');

      expect(res.status).toBe(200);
      expect(res.body.category).toBe('recipes');
    });

    it('filtre par période', async () => {
      const res = await request(app).get('/api/leaderboard?period=month');

      expect(res.status).toBe(200);
      expect(res.body.period).toBe('month');
    });

    it('fonctionne sans authentification (optionalAuth)', async () => {
      const res = await request(app).get('/api/leaderboard');
      expect(res.status).toBe(200);
    });

    it('inclut les champs rank, pseudo, score', async () => {
      const res = await request(app).get('/api/leaderboard');

      if (res.body.rankings.length > 0) {
        const entry = res.body.rankings[0];
        expect(entry).toHaveProperty('rank');
        expect(entry).toHaveProperty('pseudo');
        expect(entry).toHaveProperty('score');
      }
    });
  });
});
