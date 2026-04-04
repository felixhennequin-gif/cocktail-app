const request = require('supertest');
const app = require('../src/index');
const prisma = require('../src/prisma');
const { cleanDb, createTestUser, getAuthHeader } = require('./helpers');

let alice, aliceToken;
let ingredient1, ingredient2;

beforeEach(async () => {
  await cleanDb();
  ({ user: alice, token: aliceToken } = await createTestUser({ pseudo: 'alice', email: 'alice@test.com' }));

  ingredient1 = await prisma.ingredient.create({ data: { name: 'Rhum blanc' } });
  ingredient2 = await prisma.ingredient.create({ data: { name: 'Cachaça' } });

  await prisma.ingredientSubstitution.create({
    data: {
      ingredientId: ingredient1.id,
      substituteId: ingredient2.id,
      ratio: 1.0,
      notes: 'Substitution directe pour caipirinha',
    },
  });
});

describe('Substitutions d\'ingrédients', () => {

  describe('GET /api/ingredients/:id/substitutes', () => {
    it('retourne les substituts d\'un ingrédient', async () => {
      const res = await request(app)
        .get(`/api/ingredients/${ingredient1.id}/substitutes`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('ratio');
    });

    it('retourne les substituts bidirectionnels', async () => {
      const res = await request(app)
        .get(`/api/ingredients/${ingredient2.id}/substitutes`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('retourne un tableau vide pour un ingrédient sans substituts', async () => {
      const other = await prisma.ingredient.create({ data: { name: 'Menthe' } });
      const res = await request(app)
        .get(`/api/ingredients/${other.id}/substitutes`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('retourne 404 pour un ingrédient inexistant', async () => {
      const res = await request(app)
        .get('/api/ingredients/99999/substitutes');

      expect(res.status).toBe(404);
    });
  });
});
