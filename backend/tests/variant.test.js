const request = require('supertest');
const app     = require('../src/index');
const prisma  = require('../src/prisma');
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

// Utilitaire : crée une recette via l'API en tant qu'admin (directement PUBLISHED)
const createPublishedRecipeViaApi = async (token, data = {}) => {
  return request(app)
    .post('/api/recipes')
    .set(getAuthHeader(token))
    .send({
      name: 'Recette de base',
      difficulty: 'EASY',
      prepTime: 5,
      categoryId: category.id,
      ingredients: [],
      steps: [],
      ...data,
    });
};

// --- Créer une variante ---

describe('POST /api/recipes avec parentRecipeId', () => {
  it('crée une variante d\'une recette publiée (201)', async () => {
    // Le parent doit être PUBLISHED — on le crée directement en base
    const parent = await createTestRecipe({
      authorId: alice.id,
      categoryId: category.id,
      status: 'PUBLISHED',
      name: 'Mojito Classique',
    });

    const res = await request(app)
      .post('/api/recipes')
      .set(getAuthHeader(aliceToken))
      .send({
        name: 'Mojito Fraise',
        difficulty: 'EASY',
        prepTime: 5,
        categoryId: category.id,
        ingredients: [],
        steps: [],
        parentRecipeId: parent.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.parentRecipeId).toBe(parent.id);
  });

  it('la variante apparaît dans le champ variants de GET /recipes/:id du parent', async () => {
    const parent = await createTestRecipe({
      authorId: alice.id,
      categoryId: category.id,
      status: 'PUBLISHED',
      name: 'Daiquiri Classique',
    });

    // Créer la variante directement en base pour qu'elle soit PUBLISHED et visible
    const variant = await createTestRecipe({
      authorId: alice.id,
      categoryId: category.id,
      status: 'PUBLISHED',
      name: 'Daiquiri Framboise',
    });
    await prisma.recipe.update({
      where: { id: variant.id },
      data: { parentRecipeId: parent.id },
    });

    const res = await request(app)
      .get(`/api/recipes/${parent.id}`)
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('variants');
    expect(Array.isArray(res.body.variants)).toBe(true);
    const variantNames = res.body.variants.map((v) => v.name);
    expect(variantNames).toContain('Daiquiri Framboise');
  });

  it('rejette la création si le parent n\'est pas PUBLISHED (400)', async () => {
    const parent = await createTestRecipe({
      authorId: alice.id,
      categoryId: category.id,
      status: 'PENDING',
      name: 'Recette en attente',
    });

    const res = await request(app)
      .post('/api/recipes')
      .set(getAuthHeader(aliceToken))
      .send({
        name: 'Variante refusée',
        difficulty: 'EASY',
        prepTime: 5,
        categoryId: category.id,
        ingredients: [],
        steps: [],
        parentRecipeId: parent.id,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/publi/i);
  });

  it('rejette si le parent est déjà une variante (400) — pas de variante de variante', async () => {
    // Recette grand-parent
    const grandParent = await createTestRecipe({
      authorId: alice.id,
      categoryId: category.id,
      status: 'PUBLISHED',
      name: 'Mojito Originel',
    });

    // Variante du grand-parent (PUBLISHED pour être valide comme parent)
    const variant = await createTestRecipe({
      authorId: alice.id,
      categoryId: category.id,
      status: 'PUBLISHED',
      name: 'Mojito Variante',
    });
    await prisma.recipe.update({
      where: { id: variant.id },
      data: { parentRecipeId: grandParent.id },
    });

    // Tentative de créer une variante de la variante
    const res = await request(app)
      .post('/api/recipes')
      .set(getAuthHeader(aliceToken))
      .send({
        name: 'Variante de variante',
        difficulty: 'EASY',
        prepTime: 5,
        categoryId: category.id,
        ingredients: [],
        steps: [],
        parentRecipeId: variant.id,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/variante/i);
  });

  it('rejette si parentRecipeId est inexistant (400)', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .set(getAuthHeader(aliceToken))
      .send({
        name: 'Variante orpheline',
        difficulty: 'EASY',
        prepTime: 5,
        categoryId: category.id,
        ingredients: [],
        steps: [],
        parentRecipeId: 999999,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/parent/i);
  });
});
