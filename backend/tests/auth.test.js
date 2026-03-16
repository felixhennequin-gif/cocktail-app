const request = require('supertest');
const app     = require('../src/index');
const { cleanDb } = require('./helpers');

beforeEach(cleanDb);

describe('POST /auth/register', () => {
  it('crée un user et retourne un token', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ pseudo: 'alice', email: 'alice@test.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('alice@test.com');
    expect(res.body.user.passwordHash).toBeUndefined(); // ne pas exposer le hash
  });

  it('refuse si email déjà pris (409)', async () => {
    await request(app)
      .post('/auth/register')
      .send({ pseudo: 'alice', email: 'alice@test.com', password: 'password123' });

    const res = await request(app)
      .post('/auth/register')
      .send({ pseudo: 'alice2', email: 'alice@test.com', password: 'password123' });

    expect(res.status).toBe(409);
  });

  it('refuse si pseudo déjà pris (409)', async () => {
    await request(app)
      .post('/auth/register')
      .send({ pseudo: 'alice', email: 'alice@test.com', password: 'password123' });

    const res = await request(app)
      .post('/auth/register')
      .send({ pseudo: 'alice', email: 'alice2@test.com', password: 'password123' });

    expect(res.status).toBe(409);
  });

  it('refuse si champs manquants (400)', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ pseudo: 'alice' });

    expect(res.status).toBe(400);
  });

  it('refuse si mot de passe trop court (400)', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ pseudo: 'alice', email: 'alice@test.com', password: '123' });

    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/auth/register')
      .send({ pseudo: 'bob', email: 'bob@test.com', password: 'password123' });
  });

  it('retourne un token avec credentials valides', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'bob@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('bob@test.com');
  });

  it('refuse avec mauvais password (401)', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'bob@test.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('refuse avec email inexistant (401)', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@test.com', password: 'password123' });

    expect(res.status).toBe(401);
  });
});
