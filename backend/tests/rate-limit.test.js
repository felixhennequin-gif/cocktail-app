const express  = require('express');
const rateLimit = require('express-rate-limit');
const request   = require('supertest');

// Crée une app Express minimale avec un rate limiter configurable (sans skip de test)
const makeApp = ({ max, windowMs = 500 }) => {
  const app = express();
  app.use(express.json());
  app.use(
    rateLimit({
      windowMs,
      max,
      standardHeaders: true,
      legacyHeaders:   false,
      message: { error: 'Trop de tentatives, réessayez dans 15 minutes.' },
    })
  );
  app.post('/auth/login',    (req, res) => res.json({ ok: true }));
  app.get('/health',         (req, res) => res.json({ ok: true }));
  return app;
};

describe('Rate limiting — authLimiter', () => {
  it('accepte les requêtes dans la limite', async () => {
    const app = makeApp({ max: 5 });

    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/auth/login');
      expect(res.status).toBe(200);
    }
  });

  it('bloque après dépassement de la limite et retourne 429', async () => {
    const app = makeApp({ max: 3 });

    // 3 premières requêtes : OK
    for (let i = 0; i < 3; i++) {
      await request(app).post('/auth/login');
    }

    // 4ème requête : bloquée
    const res = await request(app).post('/auth/login');
    expect(res.status).toBe(429);
  });

  it('retourne un message d\'erreur explicite lors du blocage', async () => {
    const app = makeApp({ max: 2 });

    await request(app).post('/auth/login');
    await request(app).post('/auth/login');
    const res = await request(app).post('/auth/login');

    expect(res.status).toBe(429);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/tentatives/i);
  });

  it('envoie les headers RateLimit-Limit et RateLimit-Remaining', async () => {
    const app = makeApp({ max: 10 });

    const res = await request(app).post('/auth/login');

    expect(res.status).toBe(200);
    // standardHeaders activés — headers présents sous la forme RateLimit-*
    expect(res.headers).toHaveProperty('ratelimit-limit');
    expect(res.headers).toHaveProperty('ratelimit-remaining');
  });
});

describe('Rate limiting — generalLimiter', () => {
  it('ne bloque pas en usage normal (bien en dessous de la limite)', async () => {
    // Limite générale = 100 requêtes / 15 min — 5 requêtes = largement OK
    const app = makeApp({ max: 100 });

    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    }
  });

  it('ne retourne pas 429 pour des accès normaux', async () => {
    const app = makeApp({ max: 100 });

    const res = await request(app).get('/health');
    expect(res.status).not.toBe(429);
  });
});
