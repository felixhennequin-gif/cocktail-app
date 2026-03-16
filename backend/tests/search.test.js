const request = require('supertest');
const app     = require('../src/index');
const { cleanDb, createTestUser, createTestCategory, createTestRecipe } = require('./helpers');

let category;

beforeEach(async () => {
  await cleanDb();
  const { user } = await createTestUser({ pseudo: 'chef', email: 'chef@test.com' });
  category = await createTestCategory();
  // Le trigger SQL remplit searchVector à chaque INSERT sur Recipe
  await createTestRecipe({ authorId: user.id, categoryId: category.id, name: 'Mojito Citron Vert' });
  await createTestRecipe({ authorId: user.id, categoryId: category.id, name: 'Daiquiri Fraise' });
  await createTestRecipe({ authorId: user.id, categoryId: category.id, name: 'Pina Colada Ananas' });
});

describe('GET /recipes/search', () => {
  it('retourne des résultats pertinents', async () => {
    const res = await request(app).get('/recipes/search?q=Mojito');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].name).toMatch(/Mojito/i);
  });

  it('retourne plusieurs résultats si plusieurs matches', async () => {
    const { user } = await createTestUser({ pseudo: 'chef2', email: 'chef2@test.com' });
    await createTestRecipe({ authorId: user.id, categoryId: category.id, name: 'Mojito Menthe' });

    const res = await request(app).get('/recipes/search?q=Mojito');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.total).toBeGreaterThanOrEqual(2);
  });

  it('retourne un tableau vide si aucun match', async () => {
    const res = await request(app).get('/recipes/search?q=inexistantxyz');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });

  it('400 si q est absent', async () => {
    const res = await request(app).get('/recipes/search');
    expect(res.status).toBe(400);
  });

  it('400 si q fait moins de 2 caractères', async () => {
    const res = await request(app).get('/recipes/search?q=a');
    expect(res.status).toBe(400);
  });

  it('retourne les champs avgRating et ratingsCount', async () => {
    const res = await request(app).get('/recipes/search?q=Daiquiri');

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toHaveProperty('avgRating');
    expect(res.body.data[0]).toHaveProperty('ratingsCount');
  });
});
