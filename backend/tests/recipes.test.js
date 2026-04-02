const request = require('supertest');
const app     = require('../src/index');
const { cleanDb, createTestUser, createTestCategory, createTestRecipe, getAuthHeader } = require('./helpers');

let category;
let alice, aliceToken;
let admin, adminToken;

beforeEach(async () => {
  await cleanDb();
  category = await createTestCategory();
  ({ user: alice, token: aliceToken } = await createTestUser({ pseudo: 'alice', email: 'alice@test.com' }));
  ({ user: admin, token: adminToken } = await createTestUser({ pseudo: 'admin', email: 'admin@test.com', role: 'ADMIN' }));
});

describe('GET /api/recipes', () => {
  it('retourne une liste paginée', async () => {
    await createTestRecipe({ authorId: alice.id, categoryId: category.id });
    await createTestRecipe({ authorId: alice.id, categoryId: category.id, name: 'Daiquiri Test' });

    const res = await request(app).get('/api/recipes');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.total).toBe(2);
    expect(res.body.data[0]).toHaveProperty('avgRating');
  });

  it('filtre par categoryId', async () => {
    const other = await createTestCategory('Shots');
    await createTestRecipe({ authorId: alice.id, categoryId: category.id });
    await createTestRecipe({ authorId: alice.id, categoryId: other.id, name: 'Shot Test' });

    const res = await request(app).get(`/api/recipes?categoryId=${other.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].categoryId).toBe(other.id);
  });

  it('filtre par q (recherche textuelle)', async () => {
    await createTestRecipe({ authorId: alice.id, categoryId: category.id, name: 'Mojito Citron' });
    await createTestRecipe({ authorId: alice.id, categoryId: category.id, name: 'Daiquiri Fraise' });

    const res = await request(app).get('/api/recipes?q=Mojito');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].name).toMatch(/Mojito/i);
  });

  it('refuse les params invalides (400)', async () => {
    const res = await request(app).get('/api/recipes?page=abc');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/recipes/:id', () => {
  it('retourne la recette avec avgRating', async () => {
    const recipe = await createTestRecipe({ authorId: alice.id, categoryId: category.id });

    const res = await request(app).get(`/api/recipes/${recipe.id}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(recipe.id);
    expect(res.body).toHaveProperty('avgRating');
    expect(res.body).toHaveProperty('ratingsCount');
  });

  it('404 si inexistant', async () => {
    const res = await request(app).get('/api/recipes/999999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/recipes', () => {
  it('crée une recette → status PENDING pour un user', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .set(getAuthHeader(aliceToken))
      .send({
        name: 'Nouveau Cocktail',
        difficulty: 'EASY',
        prepTime: 10,
        categoryId: category.id,
        ingredients: [],
        steps: [],
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.authorId).toBe(alice.id);
  });

  it('crée une recette → status PUBLISHED pour un admin', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .set(getAuthHeader(adminToken))
      .send({
        name: 'Recette Admin',
        difficulty: 'MEDIUM',
        prepTime: 15,
        categoryId: category.id,
        ingredients: [],
        steps: [],
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PUBLISHED');
  });

  it('401 si non connecté', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .send({ name: 'Sans auth', difficulty: 'EASY', prepTime: 5, categoryId: category.id });

    expect(res.status).toBe(401);
  });
});

describe('PUT /api/recipes/:id', () => {
  it('modifie la recette si auteur', async () => {
    const recipe = await createTestRecipe({ authorId: alice.id, categoryId: category.id });

    const res = await request(app)
      .put(`/api/recipes/${recipe.id}`)
      .set(getAuthHeader(aliceToken))
      .send({ name: 'Nom Modifié' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Nom Modifié');
  });

  it('403 si pas l\'auteur', async () => {
    const recipe = await createTestRecipe({ authorId: admin.id, categoryId: category.id });

    const res = await request(app)
      .put(`/api/recipes/${recipe.id}`)
      .set(getAuthHeader(aliceToken))
      .send({ name: 'Tentative' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/recipes/:id', () => {
  it('supprime si auteur', async () => {
    const recipe = await createTestRecipe({ authorId: alice.id, categoryId: category.id });

    const res = await request(app)
      .delete(`/api/recipes/${recipe.id}`)
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(204);
  });

  it('supprime si admin', async () => {
    const recipe = await createTestRecipe({ authorId: alice.id, categoryId: category.id });

    const res = await request(app)
      .delete(`/api/recipes/${recipe.id}`)
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(204);
  });

  it('403 si ni auteur ni admin', async () => {
    const recipe = await createTestRecipe({ authorId: admin.id, categoryId: category.id });

    const res = await request(app)
      .delete(`/api/recipes/${recipe.id}`)
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(403);
  });
});
