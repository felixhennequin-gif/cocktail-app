const { Router } = require('express');
const prisma = require('../prisma');
const { getCache, setCache } = require('../cache');

const router = Router();
const SITE_URL = process.env.SITE_URL || 'https://cocktail-app.fr';
const CACHE_TTL = 3600; // 1h

// GET /sitemap.xml — sitemap XML dynamique
router.get('/sitemap.xml', async (req, res) => {
  try {
    // Vérifier le cache Redis
    const cached = await getCache('sitemap:xml');
    if (cached) {
      res.set('Content-Type', 'application/xml');
      return res.send(cached);
    }

    const [recipes, users, collections, categories] = await Promise.all([
      prisma.recipe.findMany({
        where: { status: 'PUBLISHED' },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.user.findMany({
        select: { id: true, createdAt: true },
      }),
      prisma.collection.findMany({
        where: { isPublic: true },
        select: { id: true, createdAt: true },
      }),
      prisma.category.findMany({
        select: { id: true },
      }),
    ]);

    const now = new Date().toISOString().split('T')[0];
    let urls = '';

    // Landing page
    urls += url(SITE_URL, now, 'daily', '1.0');
    // Catalogue
    urls += url(`${SITE_URL}/recipes`, now, 'daily', '0.9');

    // Recettes
    for (const r of recipes) {
      const lastmod = r.updatedAt.toISOString().split('T')[0];
      urls += url(`${SITE_URL}/recipes/${r.id}`, lastmod, 'weekly', '0.8');
    }

    // Catégories (page catalogue filtrée)
    for (const c of categories) {
      urls += url(`${SITE_URL}/recipes?category=${c.id}`, now, 'weekly', '0.6');
    }

    // Profils utilisateurs
    for (const u of users) {
      const lastmod = u.createdAt.toISOString().split('T')[0];
      urls += url(`${SITE_URL}/users/${u.id}`, lastmod, 'monthly', '0.5');
    }

    // Collections publiques
    for (const c of collections) {
      const lastmod = c.createdAt.toISOString().split('T')[0];
      urls += url(`${SITE_URL}/collections/${c.id}`, lastmod, 'monthly', '0.4');
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}</urlset>`;

    await setCache('sitemap:xml', xml, CACHE_TTL);
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error('[sitemap] Erreur:', err.message);
    res.status(500).send('Erreur génération sitemap');
  }
});

function url(loc, lastmod, changefreq, priority) {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>\n`;
}

module.exports = router;
