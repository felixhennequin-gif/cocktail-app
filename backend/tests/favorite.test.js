const request = require('supertest');
const app     = require('../src/index');
const { cleanDb, createTestUser, createTestCategory, createTestRecipe, getAuthHeader } = require('./helpers');

let category;
let _alice, aliceToken;
let bob, bobToken;

beforeEach(async () => {
  await cleanDb();
  category = await createTestCategory();
  ({ user: _alice, token: aliceToken } = await createTestUser({ pseudo: 'alice', email: 'alice@test.com' }));
  ({ user: bob,   token: bobToken   } = await createTestUser({ pseudo: 'bob',   email: 'bob@test.com'   }));
});

describe('POST /api/favorites/:recipeId', () => {
  it('ajoute un favori et retourne { favorited: true }', async () => {
    const recipe = await createTestRecipe({ authorId: bob.id, categoryId: category.id });

    const res = await request(app)
      .post(`/api/favorites/${recipe.id}`)
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.favorited).toBe(true);
  });

  it('retire le favori via DELETE', async () => {
    const recipe = await createTestRecipe({ authorId: bob.id, categoryId: category.id });

    // Ajoute
    await request(app)
      .post(`/api/favorites/${recipe.id}`)
      .set(getAuthHeader(aliceToken));

    // Retire via DELETE
    const res = await request(app)
      .delete(`/api/favorites/${recipe.id}`)
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.favorited).toBe(false);
  });

  it('re-ajoute après avoir retiré', async () => {
    const recipe = await createTestRecipe({ authorId: bob.id, categoryId: category.id });

    await request(app).post(`/api/favorites/${recipe.id}`).set(getAuthHeader(aliceToken)); // add
    await request(app).delete(`/api/favorites/${recipe.id}`).set(getAuthHeader(aliceToken)); // remove
    const res = await request(app).post(`/api/favorites/${recipe.id}`).set(getAuthHeader(aliceToken)); // add again

    expect(res.status).toBe(200);
    expect(res.body.favorited).toBe(true);
  });

  it('retourne 401 sans token', async () => {
    const recipe = await createTestRecipe({ authorId: bob.id, categoryId: category.id });

    const res = await request(app).post(`/api/favorites/${recipe.id}`);

    expect(res.status).toBe(401);
  });

  it('retourne 404 si la recette n\'existe pas', async () => {
    const res = await request(app)
      .post('/api/favorites/999999')
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(404);
  });
});

describe('GET /api/favorites', () => {
  it('retourne la liste des recettes favorites de l\'utilisateur', async () => {
    const recipe1 = await createTestRecipe({ authorId: bob.id, categoryId: category.id, name: 'Mojito' });
    const recipe2 = await createTestRecipe({ authorId: bob.id, categoryId: category.id, name: 'Daiquiri' });

    await request(app).post(`/api/favorites/${recipe1.id}`).set(getAuthHeader(aliceToken));
    await request(app).post(`/api/favorites/${recipe2.id}`).set(getAuthHeader(aliceToken));

    const res = await request(app)
      .get('/api/favorites')
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total', 2);
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body.data).toHaveLength(2);
    const noms = res.body.data.map((r) => r.name);
    expect(noms).toContain('Mojito');
    expect(noms).toContain('Daiquiri');
  });

  it('retourne une liste vide si aucun favori', async () => {
    const res = await request(app)
      .get('/api/favorites')
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it('chaque recette favorite contient avgRating et ratingsCount', async () => {
    const recipe = await createTestRecipe({ authorId: bob.id, categoryId: category.id });
    await request(app).post(`/api/favorites/${recipe.id}`).set(getAuthHeader(aliceToken));

    const res = await request(app)
      .get('/api/favorites')
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toHaveProperty('avgRating');
    expect(res.body.data[0]).toHaveProperty('ratingsCount');
  });

  it('isole les favoris entre utilisateurs', async () => {
    const recipe = await createTestRecipe({ authorId: bob.id, categoryId: category.id });

    // Alice ajoute le favori, Bob non
    await request(app).post(`/api/favorites/${recipe.id}`).set(getAuthHeader(aliceToken));

    const resBob = await request(app)
      .get('/api/favorites')
      .set(getAuthHeader(bobToken));

    expect(resBob.status).toBe(200);
    expect(resBob.body.data).toHaveLength(0);
    expect(resBob.body.total).toBe(0);
  });

  it('supporte la pagination via ?page et ?limit', async () => {
    const recipe1 = await createTestRecipe({ authorId: bob.id, categoryId: category.id, name: 'Mojito' });
    const recipe2 = await createTestRecipe({ authorId: bob.id, categoryId: category.id, name: 'Daiquiri' });
    const recipe3 = await createTestRecipe({ authorId: bob.id, categoryId: category.id, name: 'Margarita' });

    await request(app).post(`/api/favorites/${recipe1.id}`).set(getAuthHeader(aliceToken));
    await request(app).post(`/api/favorites/${recipe2.id}`).set(getAuthHeader(aliceToken));
    await request(app).post(`/api/favorites/${recipe3.id}`).set(getAuthHeader(aliceToken));

    const res = await request(app)
      .get('/api/favorites?page=1&limit=2')
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.total).toBe(3);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(2);
  });

  it('retourne 401 sans token', async () => {
    const res = await request(app).get('/api/favorites');
    expect(res.status).toBe(401);
  });
});
