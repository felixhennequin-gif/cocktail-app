const request = require('supertest');
const app     = require('../src/index');
const { cleanDb, createTestUser, createTestCategory, createTestRecipe, getAuthHeader } = require('./helpers');

let category;
let alice, aliceToken;
let bob,   bobToken;
let carol, carolToken;

beforeEach(async () => {
  await cleanDb();
  category = await createTestCategory();
  ({ user: alice, token: aliceToken } = await createTestUser({ pseudo: 'alice', email: 'alice@test.com' }));
  ({ user: bob,   token: bobToken   } = await createTestUser({ pseudo: 'bob',   email: 'bob@test.com'   }));
  ({ user: carol, token: carolToken } = await createTestUser({ pseudo: 'carol', email: 'carol@test.com' }));
});

describe('GET /api/feed', () => {
  it('retourne uniquement les recettes des utilisateurs suivis', async () => {
    // Alice suit Bob, pas Carol
    await request(app).post(`/api/users/${bob.id}/follow`).set(getAuthHeader(aliceToken));

    await createTestRecipe({ authorId: bob.id,   categoryId: category.id, name: 'Recette Bob' });
    await createTestRecipe({ authorId: carol.id, categoryId: category.id, name: 'Recette Carol' });

    const res = await request(app)
      .get('/api/feed')
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    const noms = res.body.data.map((r) => r.name);
    expect(noms).toContain('Recette Bob');
    expect(noms).not.toContain('Recette Carol');
  });

  it('retourne un feed vide si aucun follow', async () => {
    await createTestRecipe({ authorId: bob.id, categoryId: category.id });

    const res = await request(app)
      .get('/api/feed')
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.nextCursor).toBeNull();
  });

  it('ne retourne que les recettes PUBLISHED', async () => {
    await request(app).post(`/api/users/${bob.id}/follow`).set(getAuthHeader(aliceToken));

    await createTestRecipe({ authorId: bob.id, categoryId: category.id, name: 'Publiée',   status: 'PUBLISHED' });
    await createTestRecipe({ authorId: bob.id, categoryId: category.id, name: 'En attente', status: 'PENDING'   });
    await createTestRecipe({ authorId: bob.id, categoryId: category.id, name: 'Brouillon',  status: 'DRAFT'     });

    const res = await request(app)
      .get('/api/feed')
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    const noms = res.body.data.map((r) => r.name);
    expect(noms).toContain('Publiée');
    expect(noms).not.toContain('En attente');
    expect(noms).not.toContain('Brouillon');
  });

  it('pagination par curseur — limit fonctionne', async () => {
    await request(app).post(`/api/users/${bob.id}/follow`).set(getAuthHeader(aliceToken));

    // Créer 5 recettes
    for (let i = 1; i <= 5; i++) {
      await createTestRecipe({ authorId: bob.id, categoryId: category.id, name: `Recette ${i}` });
    }

    const res = await request(app)
      .get('/api/feed?limit=2')
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.nextCursor).not.toBeNull();
  });

  it('pagination par curseur — deuxième page via cursor', async () => {
    await request(app).post(`/api/users/${bob.id}/follow`).set(getAuthHeader(aliceToken));

    for (let i = 1; i <= 4; i++) {
      await createTestRecipe({ authorId: bob.id, categoryId: category.id, name: `Recette ${i}` });
    }

    // Première page
    const page1 = await request(app)
      .get('/api/feed?limit=2')
      .set(getAuthHeader(aliceToken));

    const cursor = page1.body.nextCursor;
    expect(cursor).not.toBeNull();

    // Deuxième page
    const page2 = await request(app)
      .get(`/api/feed?limit=2&cursor=${cursor}`)
      .set(getAuthHeader(aliceToken));

    expect(page2.status).toBe(200);
    expect(page2.body.data).toHaveLength(2);
    // Les deux pages ne doivent pas avoir les mêmes recettes
    const ids1 = page1.body.data.map((r) => r.id);
    const ids2 = page2.body.data.map((r) => r.id);
    expect(ids1.every((id) => !ids2.includes(id))).toBe(true);
  });

  it('nextCursor est null quand on est sur la dernière page', async () => {
    await request(app).post(`/api/users/${bob.id}/follow`).set(getAuthHeader(aliceToken));
    await createTestRecipe({ authorId: bob.id, categoryId: category.id });

    const res = await request(app)
      .get('/api/feed?limit=20')
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.nextCursor).toBeNull();
  });

  it('retourne 401 sans token', async () => {
    const res = await request(app).get('/api/feed');
    expect(res.status).toBe(401);
  });
});
