const request = require('supertest');
const app = require('../src/index');
const { cleanDb, createTestUser, getAuthHeader } = require('./helpers');

let alice, aliceToken;

beforeEach(async () => {
  await cleanDb();
  ({ user: alice, token: aliceToken } = await createTestUser({ pseudo: 'alice', email: 'alice@test.com' }));
});

describe('Streak (Streaks d\'activité)', () => {

  describe('GET /api/streak', () => {
    it('retourne le streak du user (par défaut sans record)', async () => {
      const res = await request(app)
        .get('/api/streak')
        .set(getAuthHeader(aliceToken));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('currentStreak', 0);
      expect(res.body).toHaveProperty('longestStreak', 0);
      expect(res.body.lastActiveDate).toBeNull();
    });

    it('refuse sans authentification', async () => {
      const res = await request(app).get('/api/streak');
      expect(res.status).toBe(401);
    });
  });
});
