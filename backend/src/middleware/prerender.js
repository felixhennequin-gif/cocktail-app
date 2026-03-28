const prisma = require('../prisma');

// Liste des user agents de crawlers/bots connus
const BOT_AGENTS = [
  'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
  'yandexbot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
  'whatsapp', 'telegrambot', 'discordbot', 'slackbot',
];

function isBot(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_AGENTS.some((bot) => ua.includes(bot));
}

// Échappe les caractères HTML spéciaux pour éviter l'injection dans les attributs meta
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Génère une page HTML minimale avec les meta tags OG
function renderMetaPage({ title, description, image, url, type = 'website' }) {
  const siteUrl = process.env.SITE_URL || 'https://cocktail-app.fr';
  const fullImage = image
    ? (image.startsWith('http') ? image : `${siteUrl}${image}`)
    : `${siteUrl}/og-default.png`;

  const safeTitle       = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage       = escapeHtml(fullImage);
  const safeUrl         = escapeHtml(url);
  const safeType        = escapeHtml(type);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:url" content="${safeUrl}">
  <meta property="og:type" content="${safeType}">
  <meta property="og:site_name" content="Cocktail App">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${safeImage}">
</head>
<body>
  <h1>${safeTitle}</h1>
  <p>${safeDescription}</p>
</body>
</html>`;
}

async function prerenderMiddleware(req, res, next) {
  // Ne traite que les requêtes GET de bots
  if (req.method !== 'GET' || !isBot(req.get('user-agent'))) {
    return next();
  }

  const siteUrl = process.env.SITE_URL || 'https://cocktail-app.fr';
  const fullUrl = `${siteUrl}${req.originalUrl}`;

  try {
    // Page de détail recette : /recipes/:id
    const recipeMatch = req.path.match(/^\/recipes\/(\d+)$/);
    if (recipeMatch) {
      const id = parseInt(recipeMatch[1], 10);
      const recipe = await prisma.recipe.findUnique({
        where: { id },
        include: { category: true, author: true },
      });
      if (recipe && recipe.status === 'PUBLISHED') {
        const desc = recipe.description || `${recipe.name} — Recette de cocktail`;
        return res.send(renderMetaPage({
          title: `${recipe.name} — Cocktail App`,
          description: desc.substring(0, 160),
          image: recipe.imageUrl,
          url: fullUrl,
          type: 'article',
        }));
      }
    }

    // Profil utilisateur : /users/:id
    const userMatch = req.path.match(/^\/users\/(\d+)$/);
    if (userMatch) {
      const id = parseInt(userMatch[1], 10);
      const user = await prisma.user.findUnique({ where: { id } });
      if (user) {
        return res.send(renderMetaPage({
          title: `${user.pseudo} — Cocktail App`,
          description: user.bio || `Profil de ${user.pseudo} sur Cocktail App`,
          image: user.avatar,
          url: fullUrl,
        }));
      }
    }

    // Collection : /collections/:id
    const collMatch = req.path.match(/^\/collections\/(\d+)$/);
    if (collMatch) {
      const id = parseInt(collMatch[1], 10);
      const collection = await prisma.collection.findUnique({
        where: { id },
        include: { user: true },
      });
      if (collection && collection.isPublic) {
        return res.send(renderMetaPage({
          title: `${collection.name} — Collection par ${collection.user.pseudo}`,
          description: collection.description || `Collection de cocktails par ${collection.user.pseudo}`,
          url: fullUrl,
        }));
      }
    }

    // Page d'accueil
    if (req.path === '/' || req.path === '') {
      return res.send(renderMetaPage({
        title: 'Cocktail App — Recettes & Inspiration',
        description: 'Découvrez des centaines de recettes de cocktails. Recherchez, filtrez, notez et partagez vos cocktails préférés.',
        url: fullUrl,
      }));
    }

    // Catalogue recettes
    if (req.path === '/recipes') {
      return res.send(renderMetaPage({
        title: 'Catalogue de cocktails — Cocktail App',
        description: 'Explorez notre catalogue complet de recettes de cocktails. Filtrez par catégorie, difficulté et tags.',
        url: fullUrl,
      }));
    }
  } catch (err) {
    // En cas d'erreur BDD, on laisse passer vers le SPA normal
    console.error('[prerender] Erreur:', err.message);
  }

  next();
}

module.exports = prerenderMiddleware;
