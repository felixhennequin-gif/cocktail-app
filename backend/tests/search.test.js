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

// La recherche full-text passe désormais uniquement par GET /api/recipes?q=
// (GET /api/recipes/search a été supprimé — doublon de getAllRecipes)
describe('GET /api/recipes?q= (recherche full-text)', () => {
  it('retourne des résultats pertinents', async () => {
    const res = await request(app).get('/api/recipes?q=Mojito');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].name).toMatch(/Mojito/i);
  });

  it('retourne plusieurs résultats si plusieurs matches', async () => {
    const { user } = await createTestUser({ pseudo: 'chef2', email: 'chef2@test.com' });
    await createTestRecipe({ authorId: user.id, categoryId: category.id, name: 'Mojito Menthe' });

    const res = await request(app).get('/api/recipes?q=Mojito');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.total).toBeGreaterThanOrEqual(2);
  });

  it('retourne un tableau vide si aucun match', async () => {
    const res = await request(app).get('/api/recipes?q=inexistantxyz');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });

  it('retourne les champs avgRating et ratingsCount', async () => {
    const res = await request(app).get('/api/recipes?q=Daiquiri');

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toHaveProperty('avgRating');
    expect(res.body.data[0]).toHaveProperty('ratingsCount');
  });
});
