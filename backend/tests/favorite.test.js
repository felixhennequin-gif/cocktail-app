const request = require('supertest');
const app     = require('../src/index');
const { cleanDb, createTestUser, createTestCategory, createTestRecipe, getAuthHeader } = require('./helpers');

let category;
let alice, aliceToken;
let bob, bobToken;

beforeEach(async () => {
  await cleanDb();
  category = await createTestCategory();
  ({ user: alice, token: aliceToken } = await createTestUser({ pseudo: 'alice', email: 'alice@test.com' }));
  ({ user: bob,   token: bobToken   } = await createTestUser({ pseudo: 'bob',   email: 'bob@test.com'   }));
});

describe('POST /favorites/:recipeId', () => {
  it('ajoute un favori et retourne { favorited: true }', async () => {
    const recipe = await createTestRecipe({ authorId: bob.id, categoryId: category.id });

    const res = await request(app)
      .post(`/favorites/${recipe.id}`)
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.favorited).toBe(true);
  });

  it('retire le favori au second appel (toggle)', async () => {
    const recipe = await createTestRecipe({ authorId: bob.id, categoryId: category.id });

    // Premier appel — ajoute
    await request(app)
      .post(`/favorites/${recipe.id}`)
      .set(getAuthHeader(aliceToken));

    // Second appel — retire
    const res = await request(app)
      .post(`/favorites/${recipe.id}`)
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.favorited).toBe(false);
  });

  it('re-ajoute après avoir retiré (toggle idempotent)', async () => {
    const recipe = await createTestRecipe({ authorId: bob.id, categoryId: category.id });

    await request(app).post(`/favorites/${recipe.id}`).set(getAuthHeader(aliceToken)); // add
    await request(app).post(`/favorites/${recipe.id}`).set(getAuthHeader(aliceToken)); // remove
    const res = await request(app).post(`/favorites/${recipe.id}`).set(getAuthHeader(aliceToken)); // add again

    expect(res.status).toBe(200);
    expect(res.body.favorited).toBe(true);
  });

  it('retourne 401 sans token', async () => {
    const recipe = await createTestRecipe({ authorId: bob.id, categoryId: category.id });

    const res = await request(app).post(`/favorites/${recipe.id}`);

    expect(res.status).toBe(401);
  });

  it('retourne 404 si la recette n\'existe pas', async () => {
    const res = await request(app)
      .post('/favorites/999999')
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(404);
  });
});

describe('GET /favorites', () => {
  it('retourne la liste des recettes favorites de l\'utilisateur', async () => {
    const recipe1 = await createTestRecipe({ authorId: bob.id, categoryId: category.id, name: 'Mojito' });
    const recipe2 = await createTestRecipe({ authorId: bob.id, categoryId: category.id, name: 'Daiquiri' });

    await request(app).post(`/favorites/${recipe1.id}`).set(getAuthHeader(aliceToken));
    await request(app).post(`/favorites/${recipe2.id}`).set(getAuthHeader(aliceToken));

    const res = await request(app)
      .get('/favorites')
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    const noms = res.body.map((r) => r.name);
    expect(noms).toContain('Mojito');
    expect(noms).toContain('Daiquiri');
  });

  it('retourne une liste vide si aucun favori', async () => {
    const res = await request(app)
      .get('/favorites')
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('chaque recette favorite contient avgRating et ratingsCount', async () => {
    const recipe = await createTestRecipe({ authorId: bob.id, categoryId: category.id });
    await request(app).post(`/favorites/${recipe.id}`).set(getAuthHeader(aliceToken));

    const res = await request(app)
      .get('/favorites')
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty('avgRating');
    expect(res.body[0]).toHaveProperty('ratingsCount');
  });

  it('isole les favoris entre utilisateurs', async () => {
    const recipe = await createTestRecipe({ authorId: bob.id, categoryId: category.id });

    // Alice ajoute le favori, Bob non
    await request(app).post(`/favorites/${recipe.id}`).set(getAuthHeader(aliceToken));

    const resBob = await request(app)
      .get('/favorites')
      .set(getAuthHeader(bobToken));

    expect(resBob.status).toBe(200);
    expect(resBob.body).toHaveLength(0);
  });

  it('retourne 401 sans token', async () => {
    const res = await request(app).get('/favorites');
    expect(res.status).toBe(401);
  });
});
