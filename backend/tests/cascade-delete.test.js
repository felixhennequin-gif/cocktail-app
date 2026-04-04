const request = require('supertest');
const app     = require('../src/index');
const prisma  = require('../src/prisma');
const { cleanDb, createTestUser, createTestCategory, getAuthHeader } = require('./helpers');

let category;
let _alice, aliceToken;
let _bob,   bobToken;
let _admin, adminToken;
let recipeId;

beforeEach(async () => {
  await cleanDb();
  category = await createTestCategory();
  ({ user: _alice, token: aliceToken } = await createTestUser({ pseudo: 'alice', email: 'alice@test.com' }));
  ({ user: _bob,   token: bobToken   } = await createTestUser({ pseudo: 'bob',   email: 'bob@test.com'   }));
  ({ user: _admin, token: adminToken } = await createTestUser({ pseudo: 'admin', email: 'admin@test.com', role: 'ADMIN' }));

  // Crée une recette complète avec toutes les dépendances
  const res = await request(app)
    .post('/api/recipes')
    .set(getAuthHeader(adminToken))
    .send({
      name:        'Cocktail Complet',
      difficulty:  'MEDIUM',
      prepTime:    10,
      categoryId:  category.id,
      ingredients: [{ name: 'Rhum', quantity: 5, unit: 'cl' }],
      steps:       [{ order: 1, description: 'Mélanger' }],
    });

  recipeId = res.body.id;

  // Alice ajoute en favori
  await request(app)
    .post(`/api/favorites/${recipeId}`)
    .set(getAuthHeader(aliceToken));

  // Alice note
  await request(app)
    .post(`/api/ratings/${recipeId}`)
    .set(getAuthHeader(aliceToken))
    .send({ score: 4 });

  // Bob commente
  await request(app)
    .post(`/api/comments/${recipeId}`)
    .set(getAuthHeader(bobToken))
    .send({ content: 'Excellent !', score: 5 });
});

describe('DELETE /api/recipes/:id — suppression en cascade', () => {
  it('supprime la recette elle-même', async () => {
    await request(app)
      .delete(`/api/recipes/${recipeId}`)
      .set(getAuthHeader(adminToken));

    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    expect(recipe).toBeNull();
  });

  it('supprime les comments associés', async () => {
    await request(app)
      .delete(`/api/recipes/${recipeId}`)
      .set(getAuthHeader(adminToken));

    const comments = await prisma.comment.findMany({ where: { recipeId } });
    expect(comments).toHaveLength(0);
  });

  it('supprime les ratings associés', async () => {
    await request(app)
      .delete(`/api/recipes/${recipeId}`)
      .set(getAuthHeader(adminToken));

    const ratings = await prisma.rating.findMany({ where: { recipeId } });
    expect(ratings).toHaveLength(0);
  });

  it('supprime les favorites associés', async () => {
    await request(app)
      .delete(`/api/recipes/${recipeId}`)
      .set(getAuthHeader(adminToken));

    const favorites = await prisma.favorite.findMany({ where: { recipeId } });
    expect(favorites).toHaveLength(0);
  });

  it('supprime les RecipeIngredient associés', async () => {
    await request(app)
      .delete(`/api/recipes/${recipeId}`)
      .set(getAuthHeader(adminToken));

    const ingredients = await prisma.recipeIngredient.findMany({ where: { recipeId } });
    expect(ingredients).toHaveLength(0);
  });

  it('supprime les steps associés', async () => {
    await request(app)
      .delete(`/api/recipes/${recipeId}`)
      .set(getAuthHeader(adminToken));

    const steps = await prisma.step.findMany({ where: { recipeId } });
    expect(steps).toHaveLength(0);
  });

  it('retourne 204 après suppression', async () => {
    const res = await request(app)
      .delete(`/api/recipes/${recipeId}`)
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(204);
  });

  it('seul l\'auteur ou admin peut supprimer (403 sinon)', async () => {
    const res = await request(app)
      .delete(`/api/recipes/${recipeId}`)
      .set(getAuthHeader(aliceToken));  // alice n'est ni auteur ni admin

    expect(res.status).toBe(403);

    // La recette doit toujours exister
    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    expect(recipe).not.toBeNull();
  });

  it('l\'auteur peut supprimer sa propre recette', async () => {
    // Créer une recette par Alice
    const category2 = await prisma.category.create({ data: { name: 'TestCatDel', slug: 'testcatdel' } });
    await request(app)
      .post('/api/recipes')
      .set(getAuthHeader(adminToken))
      .send({ name: 'Recette Alice', difficulty: 'EASY', prepTime: 5, categoryId: category2.id, ingredients: [], steps: [] });

    // Alice reçoit une recette dont elle est auteur
    const aliceRecipe = await request(app)
      .post('/api/recipes')
      .set(getAuthHeader(aliceToken))
      .send({ name: 'Ma recette', difficulty: 'EASY', prepTime: 5, categoryId: category2.id, ingredients: [], steps: [] });

    const res = await request(app)
      .delete(`/api/recipes/${aliceRecipe.body.id}`)
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(204);
  });
});
