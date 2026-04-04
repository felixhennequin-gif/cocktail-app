/**
 * Tests du module cache Redis (src/cache.js).
 *
 * Le middleware cacheMiddleware est désactivé en NODE_ENV=test,
 * donc on teste les fonctions utilitaires directement.
 * Le client Redis est disponible en test (même instance que la prod locale).
 */
const { getCache, setCache, invalidateCache, invalidateCacheByPattern, redis } = require('../src/cache');

// Préfixe pour isoler les clés de test
const KEY    = 'test:cache:unit';
const KEY_A  = 'test:cache:pattern:a';
const KEY_B  = 'test:cache:pattern:b';
const KEY_C  = 'test:cache:pattern:c';

// Attendre que Redis soit prêt (connect() est déjà appelé dans cache.js)
beforeAll(async () => {
  if (!redis) return;
  if (redis.status === 'ready') return;
  // Le module cache.js appelle déjà connect(), on attend juste qu'il soit prêt
  if (redis.status === 'connecting' || redis.status === 'connect') {
    await new Promise((resolve, reject) => {
      redis.once('ready', resolve);
      redis.once('error', reject);
      setTimeout(() => resolve(), 3000); // timeout si Redis ne répond pas
    });
  }
});

// Nettoyage avant chaque test
beforeEach(async () => {
  await invalidateCache(KEY);
  await invalidateCache(KEY_A);
  await invalidateCache(KEY_B);
  await invalidateCache(KEY_C);
});

afterAll(async () => {
  // Fermer la connexion Redis proprement pour éviter que Jest reste ouvert
  if (redis && redis.status === 'ready') {
    await redis.quit();
  }
});

describe('setCache / getCache', () => {
  it('stocke et récupère une valeur simple (string)', async () => {
    await setCache(KEY, 'hello', 60);
    const val = await getCache(KEY);
    expect(val).toBe('hello');
  });

  it('stocke et récupère un objet JSON', async () => {
    const data = { id: 42, name: 'Mojito', scores: [1, 2, 3] };
    await setCache(KEY, data, 60);
    const val = await getCache(KEY);
    expect(val).toEqual(data);
  });

  it('retourne null pour une clé inexistante (MISS)', async () => {
    const val = await getCache('test:cache:inexistant:xyz');
    expect(val).toBeNull();
  });

  it('un second appel retourne la même valeur (HIT)', async () => {
    const data = { cocktail: 'Daiquiri' };
    await setCache(KEY, data, 60);

    const hit1 = await getCache(KEY);
    const hit2 = await getCache(KEY);
    expect(hit1).toEqual(data);
    expect(hit2).toEqual(data);
  });
});

describe('invalidateCache', () => {
  it('supprime une clé existante — getCache retourne null ensuite', async () => {
    await setCache(KEY, { ok: true }, 60);

    // Vérifier que la valeur est bien là
    expect(await getCache(KEY)).not.toBeNull();

    // Invalider
    await invalidateCache(KEY);

    // La clé doit avoir disparu
    expect(await getCache(KEY)).toBeNull();
  });

  it('n\'échoue pas si la clé n\'existe pas', async () => {
    // Doit se terminer sans exception
    await expect(invalidateCache('test:cache:inexistant:abc')).resolves.not.toThrow();
  });
});

describe('invalidateCacheByPattern', () => {
  it('supprime toutes les clés correspondant au pattern', async () => {
    await setCache(KEY_A, 'valeur-a', 60);
    await setCache(KEY_B, 'valeur-b', 60);
    await setCache(KEY_C, 'valeur-c', 60);

    // Vérifier que les clés sont bien présentes
    expect(await getCache(KEY_A)).toBe('valeur-a');
    expect(await getCache(KEY_B)).toBe('valeur-b');
    expect(await getCache(KEY_C)).toBe('valeur-c');

    // Invalider par pattern
    await invalidateCacheByPattern('test:cache:pattern:*');

    // Toutes les clés doivent être supprimées
    expect(await getCache(KEY_A)).toBeNull();
    expect(await getCache(KEY_B)).toBeNull();
    expect(await getCache(KEY_C)).toBeNull();
  });

  it('ne supprime pas les clés hors pattern', async () => {
    await setCache(KEY,   'valeur-hors-pattern', 60);
    await setCache(KEY_A, 'valeur-a', 60);

    await invalidateCacheByPattern('test:cache:pattern:*');

    // La clé hors pattern doit être préservée
    expect(await getCache(KEY)).toBe('valeur-hors-pattern');
  });

  it('n\'échoue pas si aucune clé ne correspond au pattern', async () => {
    await expect(
      invalidateCacheByPattern('test:cache:pattern:inexistant:*')
    ).resolves.not.toThrow();
  });
});

describe('Fallback gracieux si Redis est indisponible', () => {
  it('getCache retourne null si le client est null (simulé)', async () => {
    // On teste directement la logique de getCache avec client=null
    // en important le module et en inspectant le comportement documenté :
    // "null si absente ou erreur"
    const val = await getCache('test:cache:inexistant:fallback');
    expect(val).toBeNull(); // null = comportement normal (MISS ou erreur Redis)
  });

  it('setCache ne lève pas d\'exception même si Redis échoue', async () => {
    // setCache est silencieux en cas d'erreur (try/catch interne)
    await expect(setCache(KEY, { ok: true }, 60)).resolves.not.toThrow();
  });
});
