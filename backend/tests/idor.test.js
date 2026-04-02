const request = require('supertest');
const app     = require('../src/index');
const prisma  = require('../src/prisma');
const { cleanDb, createTestUser, createTestCategory, createTestRecipe, getAuthHeader } = require('./helpers');

beforeEach(cleanDb);

describe('IDOR — permissions inter-utilisateurs', () => {
  let alice, bob, category;

  beforeEach(async () => {
    alice = await createTestUser({ pseudo: 'alice', email: 'alice@test.com' });
    bob   = await createTestUser({ pseudo: 'bob',   email: 'bob@test.com' });
    category = await createTestCategory();
  });

  describe('Recettes', () => {
    it('un user ne peut pas modifier la recette d\'un autre (403)', async () => {
      const recipe = await createTestRecipe({ authorId: alice.user.id, categoryId: category.id, status: 'PUBLISHED' });

      const res = await request(app)
        .put(`/api/recipes/${recipe.id}`)
        .set(getAuthHeader(bob.token))
        .send({ name: 'Hacké' });

      expect(res.status).toBe(403);
    });

    it('un user ne peut pas supprimer la recette d\'un autre (403)', async () => {
      const recipe = await createTestRecipe({ authorId: alice.user.id, categoryId: category.id });

      const res = await request(app)
        .delete(`/api/recipes/${recipe.id}`)
        .set(getAuthHeader(bob.token));

      expect(res.status).toBe(403);
    });
  });

  describe('Commentaires', () => {
    it('un user ne peut pas modifier le commentaire d\'un autre (403)', async () => {
      const recipe = await createTestRecipe({ authorId: alice.user.id, categoryId: category.id });

      // Bob commente
      const commentRes = await request(app)
        .post(`/api/comments/${recipe.id}`)
        .set(getAuthHeader(bob.token))
        .send({ content: 'Super recette', score: 5 });

      // Alice essaie de modifier le commentaire de Bob
      const res = await request(app)
        .put(`/api/comments/${commentRes.body.id}`)
        .set(getAuthHeader(alice.token))
        .send({ content: 'Modifié par alice' });

      expect(res.status).toBe(403);
    });
  });

  describe('Collections', () => {
    it('un user ne peut pas modifier la collection d\'un autre (403)', async () => {
      const collection = await prisma.collection.create({
        data: { name: 'Ma collection', userId: alice.user.id },
      });

      const res = await request(app)
        .put(`/api/collections/${collection.id}`)
        .set(getAuthHeader(bob.token))
        .send({ name: 'Volée' });

      expect(res.status).toBe(403);
    });

    it('un user ne peut pas supprimer la collection d\'un autre (403)', async () => {
      const collection = await prisma.collection.create({
        data: { name: 'Ma collection', userId: alice.user.id },
      });

      const res = await request(app)
        .delete(`/api/collections/${collection.id}`)
        .set(getAuthHeader(bob.token));

      expect(res.status).toBe(403);
    });

    it('un user ne peut pas ajouter une recette à la collection d\'un autre (403)', async () => {
      const recipe = await createTestRecipe({ authorId: alice.user.id, categoryId: category.id });
      const collection = await prisma.collection.create({
        data: { name: 'Ma collection', userId: alice.user.id },
      });

      const res = await request(app)
        .post(`/api/collections/${collection.id}/recipes`)
        .set(getAuthHeader(bob.token))
        .send({ recipeId: recipe.id });

      expect(res.status).toBe(403);
    });
  });

  describe('Notifications', () => {
    it('un user ne peut pas marquer comme lue la notification d\'un autre (403)', async () => {
      const notif = await prisma.notification.create({
        data: {
          userId: alice.user.id,
          type: 'NEW_FOLLOWER',
          data: { followerId: bob.user.id },
        },
      });

      const res = await request(app)
        .put(`/api/notifications/${notif.id}/read`)
        .set(getAuthHeader(bob.token));

      expect(res.status).toBe(403);
    });
  });
});
