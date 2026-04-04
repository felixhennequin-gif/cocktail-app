const request = require('supertest');
const app     = require('../src/index');
const { cleanDb, createTestUser, createTestCategory, createTestRecipe, getAuthHeader } = require('./helpers');

let category;
let user,  userToken;
let _admin, adminToken;

beforeEach(async () => {
  await cleanDb();
  category = await createTestCategory();
  ({ user,  token: userToken  } = await createTestUser({ pseudo: 'user',  email: 'user@test.com'  }));
  ({ user: _admin, token: adminToken } = await createTestUser({ pseudo: 'admin', email: 'admin@test.com', role: 'ADMIN' }));
});

describe('Workflow de statut des recettes', () => {
  it('POST /api/recipes par USER → status = PENDING', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .set(getAuthHeader(userToken))
      .send({ name: 'Ma recette', difficulty: 'EASY', prepTime: 5, categoryId: category.id, ingredients: [], steps: [] });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
  });

  it('POST /api/recipes par ADMIN → status = PUBLISHED', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .set(getAuthHeader(adminToken))
      .send({ name: 'Recette admin', difficulty: 'EASY', prepTime: 5, categoryId: category.id, ingredients: [], steps: [] });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PUBLISHED');
  });

  it('PATCH /api/recipes/:id/publish par ADMIN → PUBLISHED', async () => {
    const recipe = await createTestRecipe({ authorId: user.id, categoryId: category.id, status: 'PENDING' });

    const res = await request(app)
      .patch(`/api/recipes/${recipe.id}/publish`)
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PUBLISHED');
  });

  it('PATCH /api/recipes/:id/publish par USER → 403', async () => {
    const recipe = await createTestRecipe({ authorId: user.id, categoryId: category.id, status: 'PENDING' });

    const res = await request(app)
      .patch(`/api/recipes/${recipe.id}/publish`)
      .set(getAuthHeader(userToken));

    expect(res.status).toBe(403);
  });

  it('PATCH /api/recipes/:id/publish sans token → 401', async () => {
    const recipe = await createTestRecipe({ authorId: user.id, categoryId: category.id, status: 'PENDING' });

    const res = await request(app).patch(`/api/recipes/${recipe.id}/publish`);

    expect(res.status).toBe(401);
  });

  it('PATCH /api/recipes/:id/unpublish par l\'auteur → status = DRAFT', async () => {
    const recipe = await createTestRecipe({ authorId: user.id, categoryId: category.id, status: 'PUBLISHED' });

    const res = await request(app)
      .patch(`/api/recipes/${recipe.id}/unpublish`)
      .set(getAuthHeader(userToken));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('DRAFT');
  });

  it('PATCH /api/recipes/:id/unpublish par ADMIN → status = DRAFT', async () => {
    const recipe = await createTestRecipe({ authorId: user.id, categoryId: category.id, status: 'PUBLISHED' });

    const res = await request(app)
      .patch(`/api/recipes/${recipe.id}/unpublish`)
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('DRAFT');
  });

  it('PATCH /api/recipes/:id/unpublish par un autre user → 403', async () => {
    const { user: carol, token: carolToken } = await createTestUser({ pseudo: 'carol', email: 'carol@test.com' });
    const recipe = await createTestRecipe({ authorId: user.id, categoryId: category.id, status: 'PUBLISHED' });

    const res = await request(app)
      .patch(`/api/recipes/${recipe.id}/unpublish`)
      .set(getAuthHeader(carolToken));

    expect(res.status).toBe(403);
  });
});

describe('GET /api/recipes — filtrage par statut', () => {
  it('ne retourne que les recettes PUBLISHED pour un non-admin', async () => {
    await createTestRecipe({ authorId: user.id,  categoryId: category.id, name: 'Publiée',   status: 'PUBLISHED' });
    await createTestRecipe({ authorId: user.id,  categoryId: category.id, name: 'En attente', status: 'PENDING'   });
    await createTestRecipe({ authorId: user.id,  categoryId: category.id, name: 'Brouillon',  status: 'DRAFT'     });

    const res = await request(app).get('/api/recipes');

    expect(res.status).toBe(200);
    const noms = res.body.data.map((r) => r.name);
    expect(noms).toContain('Publiée');
    expect(noms).not.toContain('En attente');
    expect(noms).not.toContain('Brouillon');
  });

  it('admin voit toutes les recettes sans filtre', async () => {
    await createTestRecipe({ authorId: user.id, categoryId: category.id, name: 'Publiée',    status: 'PUBLISHED' });
    await createTestRecipe({ authorId: user.id, categoryId: category.id, name: 'En attente', status: 'PENDING'   });

    const res = await request(app)
      .get('/api/recipes')
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    const noms = res.body.data.map((r) => r.name);
    expect(noms).toContain('Publiée');
    expect(noms).toContain('En attente');
  });

  it('admin peut filtrer sur ?status=PENDING', async () => {
    await createTestRecipe({ authorId: user.id, categoryId: category.id, name: 'Publiée',    status: 'PUBLISHED' });
    await createTestRecipe({ authorId: user.id, categoryId: category.id, name: 'En attente', status: 'PENDING'   });

    const res = await request(app)
      .get('/api/recipes?status=PENDING')
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(200);
    const noms = res.body.data.map((r) => r.name);
    expect(noms).toContain('En attente');
    expect(noms).not.toContain('Publiée');
  });
});
