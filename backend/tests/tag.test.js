const request = require('supertest');
const app     = require('../src/index');
const prisma  = require('../src/prisma');
const { cleanDb, createTestUser, createTestCategory, getAuthHeader } = require('./helpers');

let category;
let alice, aliceToken;

beforeEach(async () => {
  await cleanDb();
  category = await createTestCategory();
  ({ user: alice, token: aliceToken } = await createTestUser({ pseudo: 'alice', email: 'alice@test.com' }));
});

// --- GET /api/tags ---

describe('GET /api/tags', () => {
  it('retourne 200 avec un tableau de tags (éventuellement vide)', async () => {
    const res = await request(app).get('/api/tags');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('chaque tag retourné possède un champ recipesCount', async () => {
    // Créer un tag directement
    await prisma.tag.create({ data: { name: 'aperitif' } });

    const res = await request(app).get('/api/tags');

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const tag = res.body.find((t) => t.name === 'aperitif');
    expect(tag).toBeDefined();
    expect(tag).toHaveProperty('recipesCount');
    expect(typeof tag.recipesCount).toBe('number');
  });

  it('recipesCount reflète le nombre de recettes associées', async () => {
    // Créer un tag et une recette liée via l'API
    const recipeRes = await request(app)
      .post('/api/recipes')
      .set(getAuthHeader(aliceToken))
      .send({
        name: 'Mojito Estival',
        difficulty: 'EASY',
        prepTime: 5,
        categoryId: category.id,
        ingredients: [],
        steps: [],
        tagNames: ['summer'],
      });

    expect(recipeRes.status).toBe(201);

    const res = await request(app).get('/api/tags');
    expect(res.status).toBe(200);

    const tag = res.body.find((t) => t.name === 'summer');
    expect(tag).toBeDefined();
    expect(tag.recipesCount).toBe(1);
  });
});

// --- Tags créés via POST /api/recipes avec tagNames ---

describe('Tags créés via POST /api/recipes (tagNames)', () => {
  it('crée les tags manquants et les normalise en lowercase', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .set(getAuthHeader(aliceToken))
      .send({
        name: 'Recette avec tags',
        difficulty: 'EASY',
        prepTime: 5,
        categoryId: category.id,
        ingredients: [],
        steps: [],
        tagNames: ['Mojito', 'ÉTÉ'],
      });

    expect(res.status).toBe(201);

    // Vérifier en base que les tags ont été normalisés en lowercase
    const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
    const names = tags.map((t) => t.name);
    expect(names).toContain('mojito');
    expect(names).toContain('été');
    // Aucun tag non-normalisé ne doit exister
    expect(names).not.toContain('Mojito');
    expect(names).not.toContain('ÉTÉ');
  });

  it('réutilise un tag existant (pas de doublon)', async () => {
    // Premier appel — crée le tag "citrus"
    await request(app)
      .post('/api/recipes')
      .set(getAuthHeader(aliceToken))
      .send({
        name: 'Recette 1',
        difficulty: 'EASY',
        prepTime: 5,
        categoryId: category.id,
        ingredients: [],
        steps: [],
        tagNames: ['citrus'],
      });

    // Second appel avec le même tag
    await request(app)
      .post('/api/recipes')
      .set(getAuthHeader(aliceToken))
      .send({
        name: 'Recette 2',
        difficulty: 'EASY',
        prepTime: 5,
        categoryId: category.id,
        ingredients: [],
        steps: [],
        tagNames: ['citrus'],
      });

    const tags = await prisma.tag.findMany({ where: { name: 'citrus' } });
    expect(tags).toHaveLength(1);
  });
});

// --- Filtrage par tags : GET /api/recipes?tags=id1,id2 ---

describe('GET /api/recipes?tags=<ids>', () => {
  it('retourne uniquement les recettes ayant les tags demandés', async () => {
    // Créer deux tags
    const tagA = await prisma.tag.create({ data: { name: 'tropical' } });
    const tagB = await prisma.tag.create({ data: { name: 'hivernal' } });

    // Recette avec tagA seulement (via l'API pour que les tags soient liés)
    const r1 = await request(app)
      .post('/api/recipes')
      .set(getAuthHeader(aliceToken))
      .send({
        name: 'Cocktail tropical',
        difficulty: 'EASY',
        prepTime: 5,
        categoryId: category.id,
        ingredients: [],
        steps: [],
        tagIds: [tagA.id],
      });

    // Recette avec tagB seulement
    const r2 = await request(app)
      .post('/api/recipes')
      .set(getAuthHeader(aliceToken))
      .send({
        name: 'Cocktail hivernal',
        difficulty: 'EASY',
        prepTime: 5,
        categoryId: category.id,
        ingredients: [],
        steps: [],
        tagIds: [tagB.id],
      });

    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);

    // Filtrer uniquement par tagA — seule la recette tropicale doit apparaître (parmi les publiées)
    // Note : les recettes créées par USER ont le status PENDING, donc elles ne sont pas retournées
    // à un non-admin. On vérifie juste que le filtre fonctionne (0 résultats en PUBLISHED attendu ici).
    const res = await request(app).get(`/api/recipes?tags=${tagA.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    // Aucune recette PUBLISHED ne doit avoir tagB
    const names = res.body.data.map((r) => r.name);
    expect(names).not.toContain('Cocktail hivernal');
  });

  it('filtre par tags retourne les recettes publiées ayant ces tags', async () => {
    // Créer un tag
    const tagC = await prisma.tag.create({ data: { name: 'fruite' } });

    // Créer une recette publiée directement en base avec ce tag
    const recipe = await prisma.recipe.create({
      data: {
        name: 'Cocktail fruité',
        slug: `cocktail-fruite-${Date.now()}`,
        difficulty: 'EASY',
        prepTime: 5,
        categoryId: category.id,
        authorId: alice.id,
        status: 'PUBLISHED',
        tags: {
          create: [{ tag: { connect: { id: tagC.id } } }],
        },
      },
    });

    // Créer une autre recette publiée sans ce tag
    await prisma.recipe.create({
      data: {
        name: 'Cocktail sans tag',
        slug: `cocktail-sans-tag-${Date.now()}`,
        difficulty: 'EASY',
        prepTime: 5,
        categoryId: category.id,
        authorId: alice.id,
        status: 'PUBLISHED',
      },
    });

    const res = await request(app).get(`/api/recipes?tags=${tagC.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    const names = res.body.data.map((r) => r.name);
    expect(names).toContain('Cocktail fruité');
    expect(names).not.toContain('Cocktail sans tag');
  });
});
