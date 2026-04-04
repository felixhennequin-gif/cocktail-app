const request = require('supertest');
const app = require('../src/index');
const { cleanDb, createTestUser, getAuthHeader } = require('./helpers');

let _admin, adminToken, _user, userToken;

beforeEach(async () => {
  await cleanDb();
  ({ user: _admin, token: adminToken } = await createTestUser({ pseudo: 'admin', email: 'admin@test.com', role: 'ADMIN' }));
  ({ user: _user, token: userToken } = await createTestUser({ pseudo: 'alice', email: 'alice@test.com' }));
});

describe('Glossary (Glossaire)', () => {

  describe('POST /api/glossary', () => {
    it('crée une entrée (admin)', async () => {
      const res = await request(app)
        .post('/api/glossary')
        .set(getAuthHeader(adminToken))
        .send({
          term: 'Shaker',
          definition: 'Ustensile pour mélanger les cocktails par agitation.',
          category: 'Ustensiles',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.term).toBe('Shaker');
      expect(res.body).toHaveProperty('slug');
    });

    it('refuse pour un user non-admin', async () => {
      const res = await request(app)
        .post('/api/glossary')
        .set(getAuthHeader(userToken))
        .send({
          term: 'Muddler',
          definition: 'Pilon à cocktail.',
          category: 'Ustensiles',
        });

      expect(res.status).toBe(403);
    });

    it('refuse un term dupliqué', async () => {
      await request(app).post('/api/glossary').set(getAuthHeader(adminToken))
        .send({ term: 'Shaker', definition: 'Def 1', category: 'Ustensiles' });

      const res = await request(app).post('/api/glossary').set(getAuthHeader(adminToken))
        .send({ term: 'Shaker', definition: 'Def 2', category: 'Ustensiles' });

      expect(res.status).toBe(400);
    });

    it('refuse un term vide', async () => {
      const res = await request(app)
        .post('/api/glossary')
        .set(getAuthHeader(adminToken))
        .send({ term: '', definition: 'Def', category: 'Cat' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/glossary', () => {
    beforeEach(async () => {
      await request(app).post('/api/glossary').set(getAuthHeader(adminToken))
        .send({ term: 'Shaker', definition: 'Agitateur', category: 'Ustensiles' });
      await request(app).post('/api/glossary').set(getAuthHeader(adminToken))
        .send({ term: 'Muddler', definition: 'Pilon', category: 'Ustensiles' });
      await request(app).post('/api/glossary').set(getAuthHeader(adminToken))
        .send({ term: 'Bitters', definition: 'Amers aromatiques', category: 'Ingrédients' });
    });

    it('liste toutes les entrées', async () => {
      const res = await request(app).get('/api/glossary');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBe(3);
    });

    it('filtre par catégorie', async () => {
      const res = await request(app).get('/api/glossary?category=Ingrédients');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].term).toBe('Bitters');
    });

    it('recherche par terme', async () => {
      const res = await request(app).get('/api/glossary?q=shak');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/glossary/:slug', () => {
    it('retourne une entrée par slug', async () => {
      await request(app).post('/api/glossary').set(getAuthHeader(adminToken))
        .send({ term: 'Shaker Boston', definition: 'Shaker en deux parties.', category: 'Ustensiles' });

      const res = await request(app).get('/api/glossary/shaker-boston');

      expect(res.status).toBe(200);
      expect(res.body.term).toBe('Shaker Boston');
    });

    it('retourne 404 pour un slug inexistant', async () => {
      const res = await request(app).get('/api/glossary/inexistant');
      expect(res.status).toBe(404);
    });
  });
});
