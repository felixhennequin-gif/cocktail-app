const request = require('supertest');
const app     = require('../src/index');
const { cleanDb, createTestUser, createTestCategory, createTestRecipe, getAuthHeader } = require('./helpers');

let alice, aliceToken;
let bob, bobToken;

beforeEach(async () => {
  await cleanDb();
  ({ user: alice, token: aliceToken } = await createTestUser({ pseudo: 'alice', email: 'alice@test.com' }));
  ({ user: bob,   token: bobToken   } = await createTestUser({ pseudo: 'bob',   email: 'bob@test.com'   }));
});

describe('POST /users/:id/follow', () => {
  it('crée la relation follow', async () => {
    const res = await request(app)
      .post(`/users/${bob.id}/follow`)
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.following).toBe(true);
  });

  it('est idempotent (double follow → pas d\'erreur)', async () => {
    await request(app).post(`/users/${bob.id}/follow`).set(getAuthHeader(aliceToken));
    const res = await request(app).post(`/users/${bob.id}/follow`).set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.following).toBe(true);
  });

  it('400 si on se suit soi-même', async () => {
    const res = await request(app)
      .post(`/users/${alice.id}/follow`)
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(400);
  });

  it('401 si non connecté', async () => {
    const res = await request(app).post(`/users/${bob.id}/follow`);
    expect(res.status).toBe(401);
  });
});

describe('DELETE /users/:id/follow', () => {
  it('supprime la relation', async () => {
    await request(app).post(`/users/${bob.id}/follow`).set(getAuthHeader(aliceToken));

    const res = await request(app)
      .delete(`/users/${bob.id}/follow`)
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.following).toBe(false);
  });

  it('silencieux si la relation n\'existe pas', async () => {
    const res = await request(app)
      .delete(`/users/${bob.id}/follow`)
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.following).toBe(false);
  });
});

describe('GET /feed', () => {
  it('retourne les recettes des utilisateurs suivis', async () => {
    const category = await createTestCategory();
    await createTestRecipe({ authorId: bob.id, categoryId: category.id, name: 'Recette de Bob' });
    await request(app).post(`/users/${bob.id}/follow`).set(getAuthHeader(aliceToken));

    const res = await request(app)
      .get('/feed')
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Recette de Bob');
  });

  it('retourne un feed vide si aucun suivi', async () => {
    const res = await request(app)
      .get('/feed')
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.nextCursor).toBeNull();
  });

  it('401 si non connecté', async () => {
    const res = await request(app).get('/feed');
    expect(res.status).toBe(401);
  });
});
