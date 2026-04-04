const request = require('supertest');
const app = require('../src/index');
const { cleanDb, createTestUser, getAuthHeader } = require('./helpers');

let alice, aliceToken;

beforeEach(async () => {
  await cleanDb();
  ({ user: alice, token: aliceToken } = await createTestUser({ pseudo: 'alice', email: 'alice@test.com' }));
});

describe('Newsletter', () => {

  describe('GET /api/newsletter/status', () => {
    it('retourne non abonné par défaut', async () => {
      const res = await request(app)
        .get('/api/newsletter/status')
        .set(getAuthHeader(aliceToken));

      expect(res.status).toBe(200);
      expect(res.body.subscribed).toBe(false);
    });

    it('refuse sans auth', async () => {
      const res = await request(app).get('/api/newsletter/status');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/newsletter/subscribe', () => {
    it('abonne le user', async () => {
      const res = await request(app)
        .post('/api/newsletter/subscribe')
        .set(getAuthHeader(aliceToken));

      expect(res.status).toBe(201);
      expect(res.body.subscribed).toBe(true);
    });

    it('retourne 200 si déjà abonné', async () => {
      await request(app).post('/api/newsletter/subscribe').set(getAuthHeader(aliceToken));

      const res = await request(app)
        .post('/api/newsletter/subscribe')
        .set(getAuthHeader(aliceToken));

      expect(res.status).toBe(200);
      expect(res.body.subscribed).toBe(true);
    });
  });

  describe('DELETE /api/newsletter/subscribe', () => {
    it('désabonne le user', async () => {
      await request(app).post('/api/newsletter/subscribe').set(getAuthHeader(aliceToken));

      const res = await request(app)
        .delete('/api/newsletter/subscribe')
        .set(getAuthHeader(aliceToken));

      expect(res.status).toBe(200);
      expect(res.body.subscribed).toBe(false);
    });

    it('retourne 200 même si pas abonné', async () => {
      const res = await request(app)
        .delete('/api/newsletter/subscribe')
        .set(getAuthHeader(aliceToken));

      expect(res.status).toBe(200);
    });
  });

  describe('Statut après subscribe/unsubscribe', () => {
    it('le statut reflète l\'abonnement', async () => {
      await request(app).post('/api/newsletter/subscribe').set(getAuthHeader(aliceToken));

      let res = await request(app).get('/api/newsletter/status').set(getAuthHeader(aliceToken));
      expect(res.body.subscribed).toBe(true);

      await request(app).delete('/api/newsletter/subscribe').set(getAuthHeader(aliceToken));

      res = await request(app).get('/api/newsletter/status').set(getAuthHeader(aliceToken));
      expect(res.body.subscribed).toBe(false);
    });
  });
});
