const request = require('supertest');
const app = require('../src/index');
const prisma = require('../src/prisma');
const { cleanDb, createTestUser, createTestCategory, createTestRecipe, getAuthHeader } = require('./helpers');

let admin, adminToken, user, userToken;
let category, recipe;

beforeEach(async () => {
  await cleanDb();
  ({ user: admin, token: adminToken } = await createTestUser({ pseudo: 'admin', email: 'admin@test.com', role: 'ADMIN' }));
  ({ user, token: userToken } = await createTestUser({ pseudo: 'alice', email: 'alice@test.com' }));
  category = await createTestCategory();
  recipe = await createTestRecipe({ authorId: admin.id, categoryId: category.id });

  // Créer une collection curée (isCurated = true)
  const collection = await prisma.collection.create({
    data: {
      name: 'Sélection été',
      description: 'Les meilleurs cocktails d\'été',
      isPublic: true,
      isCurated: true,
      curatorName: 'Expert Bar',
      userId: admin.id,
    },
  });

  await prisma.collectionRecipe.create({
    data: { collectionId: collection.id, recipeId: recipe.id },
  });
});

describe('Curated Collections (Collections curées)', () => {

  describe('GET /api/collections/curated', () => {
    it('liste les collections curées', async () => {
      const res = await request(app).get('/api/collections/curated');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('name', 'Sélection été');
    });

    it('fonctionne sans authentification', async () => {
      const res = await request(app).get('/api/collections/curated');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/collections/curated/:id', () => {
    it('retourne le détail d\'une collection curée', async () => {
      const list = await request(app).get('/api/collections/curated');
      const collectionId = list.body[0].id;

      const res = await request(app).get(`/api/collections/curated/${collectionId}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('recipes');
    });

    it('retourne 404 pour un id inexistant', async () => {
      const res = await request(app).get('/api/collections/curated/99999');
      expect(res.status).toBe(404);
    });
  });
});
