const request = require('supertest');
const app     = require('../src/index');
const { cleanDb, createTestUser, createTestCategory, createTestRecipe, getAuthHeader } = require('./helpers');

let category;
let alice, aliceToken;
let bob, bobToken;
let recipe;

beforeEach(async () => {
  await cleanDb();
  category = await createTestCategory();
  ({ user: alice, token: aliceToken } = await createTestUser({ pseudo: 'alice', email: 'alice@test.com' }));
  ({ user: bob,   token: bobToken   } = await createTestUser({ pseudo: 'bob',   email: 'bob@test.com'   }));
  recipe = await createTestRecipe({ authorId: bob.id, categoryId: category.id });
});

describe('POST /ratings/:recipeId', () => {
  it('crée un rating et retourne avgRating, ratingsCount, userScore', async () => {
    const res = await request(app)
      .post(`/ratings/${recipe.id}`)
      .set(getAuthHeader(aliceToken))
      .send({ score: 4 });

    expect(res.status).toBe(200);
    expect(res.body.userScore).toBe(4);
    expect(res.body.avgRating).toBe(4);
    expect(res.body.ratingsCount).toBe(1);
  });

  it('upsert — un second POST met à jour le score existant', async () => {
    await request(app)
      .post(`/ratings/${recipe.id}`)
      .set(getAuthHeader(aliceToken))
      .send({ score: 2 });

    const res = await request(app)
      .post(`/ratings/${recipe.id}`)
      .set(getAuthHeader(aliceToken))
      .send({ score: 5 });

    expect(res.status).toBe(200);
    expect(res.body.userScore).toBe(5);
    // Un seul rating (upsert, pas doublon)
    expect(res.body.ratingsCount).toBe(1);
    expect(res.body.avgRating).toBe(5);
  });

  it('calcule correctement la moyenne avec plusieurs utilisateurs', async () => {
    await request(app)
      .post(`/ratings/${recipe.id}`)
      .set(getAuthHeader(aliceToken))
      .send({ score: 3 });

    const res = await request(app)
      .post(`/ratings/${recipe.id}`)
      .set(getAuthHeader(bobToken))
      .send({ score: 5 });

    expect(res.status).toBe(200);
    expect(res.body.ratingsCount).toBe(2);
    expect(res.body.avgRating).toBe(4); // (3+5)/2 = 4
  });

  it('refuse un score de 0 (400)', async () => {
    const res = await request(app)
      .post(`/ratings/${recipe.id}`)
      .set(getAuthHeader(aliceToken))
      .send({ score: 0 });

    expect(res.status).toBe(400);
  });

  it('refuse un score de 6 (400)', async () => {
    const res = await request(app)
      .post(`/ratings/${recipe.id}`)
      .set(getAuthHeader(aliceToken))
      .send({ score: 6 });

    expect(res.status).toBe(400);
  });

  it('refuse un score négatif (400)', async () => {
    const res = await request(app)
      .post(`/ratings/${recipe.id}`)
      .set(getAuthHeader(aliceToken))
      .send({ score: -1 });

    expect(res.status).toBe(400);
  });

  it('refuse si score absent (400)', async () => {
    const res = await request(app)
      .post(`/ratings/${recipe.id}`)
      .set(getAuthHeader(aliceToken))
      .send({});

    expect(res.status).toBe(400);
  });

  it('retourne 401 sans token', async () => {
    const res = await request(app)
      .post(`/ratings/${recipe.id}`)
      .send({ score: 3 });

    expect(res.status).toBe(401);
  });

  it('retourne 404 si la recette n\'existe pas', async () => {
    const res = await request(app)
      .post('/ratings/999999')
      .set(getAuthHeader(aliceToken))
      .send({ score: 3 });

    expect(res.status).toBe(404);
  });
});

describe('GET /ratings/:recipeId/me', () => {
  it('retourne le score de l\'utilisateur connecté', async () => {
    await request(app)
      .post(`/ratings/${recipe.id}`)
      .set(getAuthHeader(aliceToken))
      .send({ score: 4 });

    const res = await request(app)
      .get(`/ratings/${recipe.id}/me`)
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(4);
  });

  it('retourne { score: null } si l\'utilisateur n\'a pas encore noté', async () => {
    const res = await request(app)
      .get(`/ratings/${recipe.id}/me`)
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.score).toBeNull();
  });

  it('isole le score entre utilisateurs', async () => {
    // Alice note 5, Bob note 2
    await request(app).post(`/ratings/${recipe.id}`).set(getAuthHeader(aliceToken)).send({ score: 5 });
    await request(app).post(`/ratings/${recipe.id}`).set(getAuthHeader(bobToken)).send({ score: 2 });

    const resAlice = await request(app).get(`/ratings/${recipe.id}/me`).set(getAuthHeader(aliceToken));
    const resBob   = await request(app).get(`/ratings/${recipe.id}/me`).set(getAuthHeader(bobToken));

    expect(resAlice.body.score).toBe(5);
    expect(resBob.body.score).toBe(2);
  });

  it('retourne 401 sans token', async () => {
    const res = await request(app).get(`/ratings/${recipe.id}/me`);
    expect(res.status).toBe(401);
  });
});
