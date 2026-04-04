const request = require('supertest');
const app     = require('../src/index');
const { cleanDb, createTestCategory } = require('./helpers');

beforeEach(cleanDb);

describe('GET /api/categories', () => {
  it('retourne une liste vide si aucune catégorie', async () => {
    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('retourne la liste des catégories triée par nom', async () => {
    await createTestCategory('Tropicaux');
    await createTestCategory('Classiques');
    await createTestCategory('Shots');

    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    // Vérifier le tri alphabétique
    const noms = res.body.map((c) => c.name);
    expect(noms).toEqual(['Classiques', 'Shots', 'Tropicaux']);
  });

  it('chaque catégorie a un id et un name', async () => {
    await createTestCategory('Cocktails');

    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('name', 'Cocktails');
  });

  it('la route est publique (pas de token requis)', async () => {
    // Vérification implicite : aucun header auth, doit quand même répondre 200
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
  });
});
