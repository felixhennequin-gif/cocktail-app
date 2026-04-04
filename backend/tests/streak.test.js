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
    it('retourne le streak du user', async () => {
      const res = await request(app)
        .get('/api/streak')
        .set(getAuthHeader(aliceToken));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('currentStreak');
      expect(res.body).toHaveProperty('longestStreak');
      expect(res.body).toHaveProperty('streakFreezeAvailable');
    });

    it('refuse sans authentification', async () => {
      const res = await request(app).get('/api/streak');
      expect(res.status).toBe(401);
    });
  });
});
