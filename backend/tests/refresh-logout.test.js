const request = require('supertest');
const app     = require('../src/index');
const prisma  = require('../src/prisma');
const { cleanDb, createTestUser } = require('./helpers');

beforeEach(cleanDb);

describe('POST /api/auth/refresh', () => {
  let refreshToken;
  let user;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ pseudo: 'alice', email: 'alice@test.com', password: 'password123' });
    refreshToken = res.body.refreshToken;
    user = res.body.user;
  });

  it('émet un nouvel access token avec un refresh token valide', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.refreshToken).not.toBe(refreshToken); // rotation
  });

  it('refuse sans refresh token (400)', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({});

    expect(res.status).toBe(400);
  });

  it('refuse avec un refresh token invalide (401)', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'invalid-token-xxx' });

    expect(res.status).toBe(401);
  });

  it('détecte la réutilisation et invalide la famille', async () => {
    // Premier refresh : consomme l'ancien token
    const res1 = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });
    expect(res1.status).toBe(200);
    const newRefreshToken = res1.body.refreshToken;

    // Réutilisation de l'ancien token (vol simulé)
    const res2 = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken }); // ancien token réutilisé
    expect(res2.status).toBe(401);
    expect(res2.body.error).toMatch(/réutilisé/i);

    // Le nouveau token doit aussi être invalide (famille supprimée)
    const res3 = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: newRefreshToken });
    expect(res3.status).toBe(401);
  });

  it('refuse un refresh token expiré (401)', async () => {
    // Forcer l'expiration du token en BDD
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  let token, refreshToken;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ pseudo: 'bob', email: 'bob@test.com', password: 'password123' });
    token = res.body.token;
    refreshToken = res.body.refreshToken;
  });

  it('invalide le refresh token et retourne ok', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    // Le refresh token ne doit plus fonctionner
    const res2 = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });
    expect(res2.status).toBe(401);
  });

  it('retourne 400 si pas de refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });
});
