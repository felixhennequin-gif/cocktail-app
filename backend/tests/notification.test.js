const request = require('supertest');
const app     = require('../src/index');
const prisma  = require('../src/prisma');
const { cleanDb, createTestUser, createTestCategory, createTestRecipe, getAuthHeader } = require('./helpers');

let alice, aliceToken;   // recevra les notifications
let bob,   bobToken;     // déclenche les actions

beforeEach(async () => {
  await cleanDb();
  ({ user: alice, token: aliceToken } = await createTestUser({ pseudo: 'alice', email: 'alice@test.com' }));
  ({ user: bob,   token: bobToken   } = await createTestUser({ pseudo: 'bob',   email: 'bob@test.com'   }));
});

// Helper : crée une notification directement en BDD
const createTestNotification = (userId, type = 'COMMENT_ON_RECIPE', data = {}) =>
  prisma.notification.create({ data: { userId, type, data } });

describe('GET /api/notifications', () => {
  it('retourne les notifications de l\'utilisateur connecté', async () => {
    await createTestNotification(alice.id, 'COMMENT_ON_RECIPE', { recipeId: 1, commentPreview: 'Super !' });
    await createTestNotification(alice.id, 'NEW_RECIPE', { recipeId: 2 });

    const res = await request(app)
      .get('/api/notifications')
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body).toHaveProperty('unreadCount', 2);
  });

  it('retourne une liste vide si aucune notification', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.unreadCount).toBe(0);
  });

  it('retourne 401 sans token', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });

  it('isole les notifications entre utilisateurs', async () => {
    // Notification pour Alice uniquement
    await createTestNotification(alice.id);

    const resBob = await request(app)
      .get('/api/notifications')
      .set(getAuthHeader(bobToken));

    expect(resBob.status).toBe(200);
    expect(resBob.body.data).toHaveLength(0);
  });
});

describe('PUT /api/notifications/:id/read', () => {
  it('marque une notification comme lue', async () => {
    const notif = await createTestNotification(alice.id);

    const res = await request(app)
      .put(`/api/notifications/${notif.id}/read`)
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    // Vérifier que unreadCount est bien à 0
    const check = await request(app).get('/api/notifications').set(getAuthHeader(aliceToken));
    expect(check.body.unreadCount).toBe(0);
  });

  it('retourne 403 si la notification appartient à un autre utilisateur', async () => {
    const notif = await createTestNotification(alice.id);

    const res = await request(app)
      .put(`/api/notifications/${notif.id}/read`)
      .set(getAuthHeader(bobToken));

    expect(res.status).toBe(403);
  });

  it('retourne 404 si la notification n\'existe pas', async () => {
    const res = await request(app)
      .put('/api/notifications/999999/read')
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(404);
  });

  it('retourne 401 sans token', async () => {
    const notif = await createTestNotification(alice.id);
    const res = await request(app).put(`/api/notifications/${notif.id}/read`);
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/notifications/read-all', () => {
  it('marque toutes les notifications de l\'utilisateur comme lues', async () => {
    await createTestNotification(alice.id);
    await createTestNotification(alice.id);
    await createTestNotification(alice.id);

    const res = await request(app)
      .put('/api/notifications/read-all')
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(3);

    const check = await request(app).get('/api/notifications').set(getAuthHeader(aliceToken));
    expect(check.body.unreadCount).toBe(0);
  });

  it('ne touche pas les notifications des autres utilisateurs', async () => {
    await createTestNotification(alice.id);
    await createTestNotification(bob.id);

    await request(app)
      .put('/api/notifications/read-all')
      .set(getAuthHeader(aliceToken));

    // La notification de Bob doit rester non lue
    const resBob = await request(app).get('/api/notifications').set(getAuthHeader(bobToken));
    expect(resBob.body.unreadCount).toBe(1);
  });

  it('retourne { updated: 0 } si aucune notification non lue', async () => {
    const res = await request(app)
      .put('/api/notifications/read-all')
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(0);
  });

  it('retourne 401 sans token', async () => {
    const res = await request(app).put('/api/notifications/read-all');
    expect(res.status).toBe(401);
  });
});

describe('Création automatique de notifications', () => {
  it('crée une notification COMMENT_ON_RECIPE lors d\'un commentaire sur une recette', async () => {
    const category = await require('../src/prisma').category.create({ data: { name: 'TestCat' } });
    // Alice crée une recette, Bob la commente
    const recipe = await createTestRecipe({ authorId: alice.id, categoryId: category.id });

    await request(app)
      .post(`/api/comments/${recipe.id}`)
      .set(getAuthHeader(bobToken))
      .send({ content: 'Très bonne recette !', score: 5 });

    // Petite attente pour le fire-and-forget
    await new Promise((r) => setTimeout(r, 100));

    const res = await request(app)
      .get('/api/notifications')
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    const notif = res.body.data.find((n) => n.type === 'COMMENT_ON_RECIPE');
    expect(notif).toBeDefined();
    expect(notif.data.recipeId).toBe(recipe.id);
  });

  it('crée une notification NEW_FOLLOWER lors d\'un follow', async () => {
    // Bob suit Alice → Alice doit recevoir une notification
    await request(app)
      .post(`/api/users/${alice.id}/follow`)
      .set(getAuthHeader(bobToken));

    // Petite attente pour le fire-and-forget
    await new Promise((r) => setTimeout(r, 100));

    const res = await request(app)
      .get('/api/notifications')
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(200);
    const notif = res.body.data.find((n) => n.type === 'NEW_FOLLOWER');
    expect(notif).toBeDefined();
    expect(notif.data.followerId).toBe(bob.id);
    expect(notif.data.followerPseudo).toBe('bob');
  });

  it('ne crée PAS de notification en double si déjà suivi (idempotent)', async () => {
    // Bob suit Alice deux fois
    await request(app).post(`/api/users/${alice.id}/follow`).set(getAuthHeader(bobToken));
    await request(app).post(`/api/users/${alice.id}/follow`).set(getAuthHeader(bobToken));

    await new Promise((r) => setTimeout(r, 100));

    const res = await request(app)
      .get('/api/notifications')
      .set(getAuthHeader(aliceToken));

    const followNotifs = res.body.data.filter((n) => n.type === 'NEW_FOLLOWER');
    expect(followNotifs).toHaveLength(1);
  });
});
