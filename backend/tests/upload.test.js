const request = require('supertest');
const app     = require('../src/index');
const { cleanDb, createTestUser, getAuthHeader } = require('./helpers');

// Buffer JPEG minimal valide (magic bytes FF D8 FF E0 + en-tête JFIF)
// Reconnu correctement par file-type via FileType.fromFile()
const VALID_JPEG_BUFFER = Buffer.from([
  0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10,
  0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
]);

// Buffer d'un fichier texte (pas une image)
const TEXT_BUFFER = Buffer.from('Ceci est un fichier texte, pas une image.');

let alice, aliceToken;

beforeEach(async () => {
  await cleanDb();
  ({ user: alice, token: aliceToken } = await createTestUser({ pseudo: 'alice', email: 'alice@test.com' }));
});

// --- POST /api/upload ---

describe('POST /api/upload', () => {
  it('retourne 200 et une URL si un fichier JPEG valide est envoyé', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set(getAuthHeader(aliceToken))
      .attach('image', VALID_JPEG_BUFFER, { filename: 'test.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('url');
    expect(typeof res.body.url).toBe('string');
    expect(res.body.url).toMatch(/\/uploads\/.+\.jpg$/);
  });

  it('retourne 400 si le fichier envoyé n\'est pas une image (type non autorisé)', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set(getAuthHeader(aliceToken))
      .attach('image', TEXT_BUFFER, { filename: 'file.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
  });

  it('retourne 400 si aucun fichier n\'est envoyé', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set(getAuthHeader(aliceToken));

    expect(res.status).toBe(400);
  });

  it('retourne 401 sans token d\'authentification', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('image', VALID_JPEG_BUFFER, { filename: 'test.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(401);
  });

  it('retourne 400 si un fichier avec extension image mais contenu invalide est envoyé', async () => {
    // Extension .jpg mais contenu texte — doit être rejeté par le magic bytes checker
    const res = await request(app)
      .post('/api/upload')
      .set(getAuthHeader(aliceToken))
      .attach('image', TEXT_BUFFER, { filename: 'fake.jpg', contentType: 'image/jpeg' });

    // Le fileFilter laisse passer (extension et MIME OK), mais validateImageMagicBytes rejette
    expect(res.status).toBe(400);
  });
});
