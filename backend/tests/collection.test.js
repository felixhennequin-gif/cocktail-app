const request = require('supertest');
const app     = require('../src/index');
const prisma  = require('../src/prisma');
const { cleanDb, createTestUser, createTestCategory, createTestRecipe, getAuthHeader } = require('./helpers');

let category;
let alice, aliceToken;
let bob, bobToken;

beforeEach(async () => {
  await cleanDb();
  category = await createTestCategory();
  ({ user: alice, token: aliceToken } = await createTestUser({ pseudo: 'alice', email: 'alice@test.com' }));
  ({ user: bob,   token: bobToken   } = await createTestUser({ pseudo: 'bob',   email: 'bob@test.com'   }));
});

// --- POST /api/collections ---

describe('POST /api/collections', () => {
  it('crée une collection et retourne 201', async () => {
    const res = await request(app)
      .post('/api/collections')
      .set(getAuthHeader(aliceToken))
      .send({ name: 'Mes cocktails préférés' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Mes cocktails préférés');
    expect(res.body.userId).toBe(alice.id);
  });

  it('retourne 401 sans token', async () => {
    const res = await request(app)
      .post('/api/collections')
      .send({ name: 'Collection non autorisée' });

    expect(res.status).toBe(401);
  });

  it('retourne 400 si le nom est manquant', async () => {
    const res = await request(app)
      .post('/api/collections')
      .set(getAuthHeader(aliceToken))
      .send({});

    expect(res.status).toBe(400);
  });

  it('refuse la 21e collection (limite 20 par utilisateur)', async () => {
    // Créer 20 collections directement via prisma
    const data = Array.from({ length: 20 }, (_, i) => ({
      name: `Collection ${i + 1}`,
      isPublic: true,
      userId: alice.id,
    }));
    await prisma.collection.createMany({ data });

    // La 21e doit être refusée
    const res = await request(app)
      .post('/api/collections')
      .set(getAuthHeader(aliceToken))
      .send({ name: 'Collection de trop' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/20/);
  });
});

// --- GET /api/collections/:id ---

describe('GET /api/collections/:id', () => {
  it('retourne une collection publique (200)', async () => {
    const created = await prisma.collection.create({
      data: { name: 'Ma collection', isPublic: true, userId: alice.id },
    });

    const res = await request(app)
      .get(`/api/collections/${created.id}`)
      .set(getAuthHeader(bobToken));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.id);
    expect(res.body.name).toBe('Ma collection');
  });

  it('retourne 404 si la collection n\'existe pas', async () => {
    const res = await request(app)
      .get('/api/collections/999999')
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(404);
  });

  it('collection privée : visible par le propriétaire (200)', async () => {
    const created = await prisma.collection.create({
      data: { name: 'Collection secrète', isPublic: false, userId: alice.id },
    });

    const res = await request(app)
      .get(`/api/collections/${created.id}`)
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.id);
  });

  it('collection privée : non visible par un autre utilisateur (404)', async () => {
    const created = await prisma.collection.create({
      data: { name: 'Collection secrète', isPublic: false, userId: alice.id },
    });

    const res = await request(app)
      .get(`/api/collections/${created.id}`)
      .set(getAuthHeader(bobToken));

    expect(res.status).toBe(404);
  });
});

// --- PUT /api/collections/:id ---

describe('PUT /api/collections/:id', () => {
  it('met à jour une collection (200)', async () => {
    const created = await prisma.collection.create({
      data: { name: 'Ancien nom', isPublic: true, userId: alice.id },
    });

    const res = await request(app)
      .put(`/api/collections/${created.id}`)
      .set(getAuthHeader(aliceToken))
      .send({ name: 'Nouveau nom', isPublic: false });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Nouveau nom');
    expect(res.body.isPublic).toBe(false);
  });

  it('retourne 403 si un autre user tente de modifier (403)', async () => {
    const created = await prisma.collection.create({
      data: { name: 'Collection Alice', isPublic: true, userId: alice.id },
    });

    const res = await request(app)
      .put(`/api/collections/${created.id}`)
      .set(getAuthHeader(bobToken))
      .send({ name: 'Piraté' });

    expect(res.status).toBe(403);
  });

  it('retourne 404 si la collection n\'existe pas', async () => {
    const res = await request(app)
      .put('/api/collections/999999')
      .set(getAuthHeader(aliceToken))
      .send({ name: 'Nouveau nom' });

    expect(res.status).toBe(404);
  });
});

// --- DELETE /api/collections/:id ---

describe('DELETE /api/collections/:id', () => {
  it('supprime une collection (204)', async () => {
    const created = await prisma.collection.create({
      data: { name: 'À supprimer', isPublic: true, userId: alice.id },
    });

    const res = await request(app)
      .delete(`/api/collections/${created.id}`)
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(204);

    // Vérifier que la collection n'existe plus
    const inDb = await prisma.collection.findUnique({ where: { id: created.id } });
    expect(inDb).toBeNull();
  });

  it('retourne 403 si un autre user tente de supprimer', async () => {
    const created = await prisma.collection.create({
      data: { name: 'Collection Alice', isPublic: true, userId: alice.id },
    });

    const res = await request(app)
      .delete(`/api/collections/${created.id}`)
      .set(getAuthHeader(bobToken));

    expect(res.status).toBe(403);
  });
});

// --- POST /api/collections/:id/recipes ---

describe('POST /api/collections/:id/recipes', () => {
  it('ajoute une recette à la collection (201)', async () => {
    const collection = await prisma.collection.create({
      data: { name: 'Ma collection', isPublic: true, userId: alice.id },
    });
    const recipe = await createTestRecipe({ authorId: bob.id, categoryId: category.id });

    const res = await request(app)
      .post(`/api/collections/${collection.id}/recipes`)
      .set(getAuthHeader(aliceToken))
      .send({ recipeId: recipe.id });

    expect(res.status).toBe(201);
    expect(res.body.added).toBe(true);
  });

  it('retourne 409 si la recette est déjà dans la collection', async () => {
    const collection = await prisma.collection.create({
      data: { name: 'Ma collection', isPublic: true, userId: alice.id },
    });
    const recipe = await createTestRecipe({ authorId: bob.id, categoryId: category.id });

    // Premier ajout
    await request(app)
      .post(`/api/collections/${collection.id}/recipes`)
      .set(getAuthHeader(aliceToken))
      .send({ recipeId: recipe.id });

    // Doublon
    const res = await request(app)
      .post(`/api/collections/${collection.id}/recipes`)
      .set(getAuthHeader(aliceToken))
      .send({ recipeId: recipe.id });

    expect(res.status).toBe(409);
  });

  it('retourne 400 si la collection atteint 100 recettes', async () => {
    const collection = await prisma.collection.create({
      data: { name: 'Collection pleine', isPublic: true, userId: alice.id },
    });

    // Créer une recette de référence pour les 100 entrées
    const recipe = await createTestRecipe({ authorId: bob.id, categoryId: category.id, name: 'Recette ref' });

    // Insérer directement 100 recettes dans la collection via prisma
    // On crée 100 recettes distinctes pour respecter la contrainte unique (collectionId, recipeId)
    const recipes = await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        createTestRecipe({ authorId: bob.id, categoryId: category.id, name: `Recette ${i + 1}` })
      )
    );

    await prisma.collectionRecipe.createMany({
      data: recipes.map((r) => ({ collectionId: collection.id, recipeId: r.id })),
    });

    // La 101e recette doit être refusée
    const res = await request(app)
      .post(`/api/collections/${collection.id}/recipes`)
      .set(getAuthHeader(aliceToken))
      .send({ recipeId: recipe.id });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/100/);
  });

  it('retourne 403 si un autre user tente d\'ajouter une recette', async () => {
    const collection = await prisma.collection.create({
      data: { name: 'Collection Alice', isPublic: true, userId: alice.id },
    });
    const recipe = await createTestRecipe({ authorId: alice.id, categoryId: category.id });

    const res = await request(app)
      .post(`/api/collections/${collection.id}/recipes`)
      .set(getAuthHeader(bobToken))
      .send({ recipeId: recipe.id });

    expect(res.status).toBe(403);
  });

  it('retourne 404 si la recette n\'existe pas', async () => {
    const collection = await prisma.collection.create({
      data: { name: 'Ma collection', isPublic: true, userId: alice.id },
    });

    const res = await request(app)
      .post(`/api/collections/${collection.id}/recipes`)
      .set(getAuthHeader(aliceToken))
      .send({ recipeId: 999999 });

    expect(res.status).toBe(404);
  });
});

// --- DELETE /api/collections/:id/recipes/:recipeId ---

describe('DELETE /api/collections/:id/recipes/:recipeId', () => {
  it('retire une recette de la collection (204)', async () => {
    const collection = await prisma.collection.create({
      data: { name: 'Ma collection', isPublic: true, userId: alice.id },
    });
    const recipe = await createTestRecipe({ authorId: bob.id, categoryId: category.id });

    // Ajouter la recette d'abord
    await prisma.collectionRecipe.create({
      data: { collectionId: collection.id, recipeId: recipe.id },
    });

    const res = await request(app)
      .delete(`/api/collections/${collection.id}/recipes/${recipe.id}`)
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(204);

    // Vérifier que la recette n'est plus dans la collection
    const entry = await prisma.collectionRecipe.findUnique({
      where: { collectionId_recipeId: { collectionId: collection.id, recipeId: recipe.id } },
    });
    expect(entry).toBeNull();
  });

  it('retourne 404 si la recette n\'est pas dans la collection', async () => {
    const collection = await prisma.collection.create({
      data: { name: 'Ma collection', isPublic: true, userId: alice.id },
    });
    const recipe = await createTestRecipe({ authorId: bob.id, categoryId: category.id });

    const res = await request(app)
      .delete(`/api/collections/${collection.id}/recipes/${recipe.id}`)
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(404);
  });

  it('retourne 403 si un autre user tente de retirer la recette', async () => {
    const collection = await prisma.collection.create({
      data: { name: 'Collection Alice', isPublic: true, userId: alice.id },
    });
    const recipe = await createTestRecipe({ authorId: bob.id, categoryId: category.id });

    await prisma.collectionRecipe.create({
      data: { collectionId: collection.id, recipeId: recipe.id },
    });

    const res = await request(app)
      .delete(`/api/collections/${collection.id}/recipes/${recipe.id}`)
      .set(getAuthHeader(bobToken));

    expect(res.status).toBe(403);
  });
});
