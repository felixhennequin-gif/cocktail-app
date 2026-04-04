const request = require('supertest');
const app     = require('../src/index');
const { cleanDb, createTestUser, createTestCategory, createTestRecipe, getAuthHeader } = require('./helpers');

let category;
let alice, aliceToken;   // commentateur
let bob,   bobToken;     // auteur de la recette
let _carol, carolToken;   // autre user
let _admin, adminToken;
let recipe;

beforeEach(async () => {
  await cleanDb();
  category = await createTestCategory();
  ({ user: alice, token: aliceToken } = await createTestUser({ pseudo: 'alice', email: 'alice@test.com' }));
  ({ user: bob,   token: bobToken   } = await createTestUser({ pseudo: 'bob',   email: 'bob@test.com'   }));
  ({ user: _carol, token: carolToken } = await createTestUser({ pseudo: 'carol', email: 'carol@test.com' }));
  ({ user: _admin, token: adminToken } = await createTestUser({ pseudo: 'admin', email: 'admin@test.com', role: 'ADMIN' }));
  // Recette créée par Bob
  recipe = await createTestRecipe({ authorId: bob.id, categoryId: category.id });
});

describe('GET /api/comments/:recipeId', () => {
  it('retourne la liste des commentaires (public)', async () => {
    // Alice laisse un commentaire
    await request(app)
      .post(`/api/comments/${recipe.id}`)
      .set(getAuthHeader(aliceToken))
      .send({ content: 'Excellent cocktail !', score: 5 });

    const res = await request(app).get(`/api/comments/${recipe.id}`);

    expect(res.status).toBe(200);
    expect(res.body.comments).toHaveLength(1);
    expect(res.body.comments[0].content).toBe('Excellent cocktail !');
    expect(res.body).toHaveProperty('avgRating');
    expect(res.body).toHaveProperty('ratingsCount');
  });

  it('retourne une liste vide si aucun commentaire', async () => {
    const res = await request(app).get(`/api/comments/${recipe.id}`);

    expect(res.status).toBe(200);
    expect(res.body.comments).toHaveLength(0);
  });

  it('inclut myComment si l\'utilisateur est connecté', async () => {
    await request(app)
      .post(`/api/comments/${recipe.id}`)
      .set(getAuthHeader(aliceToken))
      .send({ content: 'Super recette', score: 4 });

    const res = await request(app)
      .get(`/api/comments/${recipe.id}`)
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.myComment).not.toBeNull();
    expect(res.body.myComment.content).toBe('Super recette');
  });
});

describe('POST /api/comments/:recipeId', () => {
  it('crée un commentaire avec une note (score obligatoire)', async () => {
    const res = await request(app)
      .post(`/api/comments/${recipe.id}`)
      .set(getAuthHeader(aliceToken))
      .send({ content: 'Délicieux !', score: 4 });

    expect(res.status).toBe(201);
    expect(res.body.content).toBe('Délicieux !');
    expect(res.body.userId).toBe(alice.id);
  });

  it('retourne 400 si le contenu est vide', async () => {
    const res = await request(app)
      .post(`/api/comments/${recipe.id}`)
      .set(getAuthHeader(aliceToken))
      .send({ content: '   ', score: 3 });

    expect(res.status).toBe(400);
  });

  it('retourne 400 si le score est absent', async () => {
    const res = await request(app)
      .post(`/api/comments/${recipe.id}`)
      .set(getAuthHeader(aliceToken))
      .send({ content: 'Bon cocktail' });

    expect(res.status).toBe(400);
  });

  it('retourne 400 si le score est hors range', async () => {
    const res = await request(app)
      .post(`/api/comments/${recipe.id}`)
      .set(getAuthHeader(aliceToken))
      .send({ content: 'Bof', score: 6 });

    expect(res.status).toBe(400);
  });

  it('retourne 401 sans token', async () => {
    const res = await request(app)
      .post(`/api/comments/${recipe.id}`)
      .send({ content: 'Test', score: 3 });

    expect(res.status).toBe(401);
  });

  it('retourne 403 si l\'auteur commente sa propre recette', async () => {
    const res = await request(app)
      .post(`/api/comments/${recipe.id}`)
      .set(getAuthHeader(bobToken))
      .send({ content: 'Moi-même', score: 5 });

    expect(res.status).toBe(403);
  });

  it('retourne 409 si l\'utilisateur a déjà commenté (unique userId+recipeId)', async () => {
    await request(app)
      .post(`/api/comments/${recipe.id}`)
      .set(getAuthHeader(aliceToken))
      .send({ content: 'Premier', score: 3 });

    const res = await request(app)
      .post(`/api/comments/${recipe.id}`)
      .set(getAuthHeader(aliceToken))
      .send({ content: 'Second', score: 4 });

    expect(res.status).toBe(409);
  });

  it('retourne 404 si la recette n\'existe pas', async () => {
    const res = await request(app)
      .post('/api/comments/999999')
      .set(getAuthHeader(aliceToken))
      .send({ content: 'Inexistant', score: 3 });

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/comments/:id', () => {
  let commentId;

  beforeEach(async () => {
    const res = await request(app)
      .post(`/api/comments/${recipe.id}`)
      .set(getAuthHeader(aliceToken))
      .send({ content: 'Commentaire initial', score: 3 });
    commentId = res.body.id;
  });

  it('modifie le commentaire si auteur', async () => {
    const res = await request(app)
      .put(`/api/comments/${commentId}`)
      .set(getAuthHeader(aliceToken))
      .send({ content: 'Commentaire modifié' });

    expect(res.status).toBe(200);
    expect(res.body.content).toBe('Commentaire modifié');
  });

  it('retourne 403 si pas l\'auteur', async () => {
    const res = await request(app)
      .put(`/api/comments/${commentId}`)
      .set(getAuthHeader(carolToken))
      .send({ content: 'Tentative' });

    expect(res.status).toBe(403);
  });

  it('retourne 400 si le nouveau contenu est vide', async () => {
    const res = await request(app)
      .put(`/api/comments/${commentId}`)
      .set(getAuthHeader(aliceToken))
      .send({ content: '' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/comments/:id', () => {
  let commentId;

  beforeEach(async () => {
    const res = await request(app)
      .post(`/api/comments/${recipe.id}`)
      .set(getAuthHeader(aliceToken))
      .send({ content: 'À supprimer', score: 3 });
    commentId = res.body.id;
  });

  it('supprime par l\'auteur du commentaire', async () => {
    const res = await request(app)
      .delete(`/api/comments/${commentId}`)
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(204);
  });

  it('supprime par l\'auteur de la recette', async () => {
    const res = await request(app)
      .delete(`/api/comments/${commentId}`)
      .set(getAuthHeader(bobToken));

    expect(res.status).toBe(204);
  });

  it('supprime par un admin', async () => {
    const res = await request(app)
      .delete(`/api/comments/${commentId}`)
      .set(getAuthHeader(adminToken));

    expect(res.status).toBe(204);
  });

  it('retourne 403 si ni auteur, ni auteur de la recette, ni admin', async () => {
    const res = await request(app)
      .delete(`/api/comments/${commentId}`)
      .set(getAuthHeader(carolToken));

    expect(res.status).toBe(403);
  });

  it('retourne 401 sans token', async () => {
    const res = await request(app).delete(`/api/comments/${commentId}`);
    expect(res.status).toBe(401);
  });
});
