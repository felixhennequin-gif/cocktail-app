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

// Génère le JSON-LD Schema.org pour une recette
function buildRecipeJsonLd(recipe, siteUrl, avgRating, ratingsCount) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.name,
    image: recipe.imageUrl
      ? (recipe.imageUrl.startsWith('http') ? recipe.imageUrl : `${siteUrl}${recipe.imageUrl}`)
      : undefined,
    author: recipe.author ? { '@type': 'Person', name: recipe.author.pseudo } : undefined,
    datePublished: recipe.createdAt?.toISOString?.() || recipe.createdAt,
    description: recipe.description || `${recipe.name} — Recette de cocktail`,
    prepTime: recipe.prepTime ? `PT${recipe.prepTime}M` : undefined,
    recipeCategory: recipe.category?.name,
    recipeIngredient: recipe.ingredients?.map((ri) =>
      `${ri.quantity || ''} ${ri.unit || ''} ${ri.ingredient?.name || ''}`.trim()
    ),
    recipeInstructions: recipe.steps?.map((s) => ({
      '@type': 'HowToStep',
      position: s.order,
      text: s.description,
    })),
    recipeYield: recipe.servings ? `${recipe.servings} portions` : undefined,
  };

  if (avgRating && ratingsCount > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: avgRating.toFixed(1),
      ratingCount: ratingsCount,
      bestRating: '5',
      worstRating: '1',
    };
  }

  // Supprimer les champs undefined
  return JSON.stringify(schema, (k, v) => v === undefined ? undefined : v);
}

// Génère une page HTML minimale avec les meta tags OG
function renderMetaPage({ title, description, image, url, type = 'website', jsonLd }) {
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
  <meta property="og:site_name" content="Écume">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${safeImage}">${jsonLd ? `
  <script type="application/ld+json">${jsonLd}</script>` : ''}
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
        include: {
          category: true,
          author: true,
          ingredients: { include: { ingredient: true } },
          steps: { orderBy: { order: 'asc' } },
        },
      });
      if (recipe && recipe.status === 'PUBLISHED') {
        const desc = recipe.description || `${recipe.name} — Recette de cocktail`;
        // Calcul de la note moyenne pour le JSON-LD
        const agg = await prisma.rating.aggregate({
          where: { recipeId: id },
          _avg: { score: true },
          _count: { score: true },
        });
        const jsonLd = buildRecipeJsonLd(recipe, siteUrl, agg._avg.score, agg._count.score);
        // OG image dynamique générée par l'endpoint /api/recipes/:id/og-image
        const ogImage = `${siteUrl}/api/recipes/${id}/og-image`;
        return res.send(renderMetaPage({
          title: `${recipe.name} — Écume`,
          description: desc.substring(0, 160),
          image: ogImage,
          url: fullUrl,
          type: 'article',
          jsonLd,
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
          title: `${user.pseudo} — Écume`,
          description: user.bio || `Profil de ${user.pseudo} sur Écume`,
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
        title: 'Écume — Recettes & Inspiration',
        description: 'Découvrez des centaines de recettes de cocktails. Recherchez, filtrez, notez et partagez vos cocktails préférés.',
        url: fullUrl,
      }));
    }

    // Page catégorie : /categories/:slug
    const catMatch = req.path.match(/^\/categories\/([^/]+)$/);
    if (catMatch) {
      const slug = decodeURIComponent(catMatch[1]);
      const category = await prisma.category.findUnique({ where: { slug } });
      if (category) {
        const recipesCount = await prisma.recipe.count({
          where: { categoryId: category.id, status: 'PUBLISHED' },
        });
        const title = `Cocktails ${category.name} — Écume`;
        const description = category.description
          || `Découvrez nos ${recipesCount} recettes de cocktails ${category.name}. Filtrez, notez et partagez vos cocktails préférés.`;
        const breadcrumbJsonLd = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Accueil', item: siteUrl },
            { '@type': 'ListItem', position: 2, name: 'Catégories', item: `${siteUrl}/recipes` },
            { '@type': 'ListItem', position: 3, name: category.name, item: `${siteUrl}/categories/${category.slug}` },
          ],
        });
        const collectionJsonLd = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: title,
          description,
          url: `${siteUrl}/categories/${category.slug}`,
          numberOfItems: recipesCount,
        });
        const combinedJsonLd = `${breadcrumbJsonLd}</script>\n  <script type="application/ld+json">${collectionJsonLd}`;
        return res.send(renderMetaPage({
          title,
          description: description.substring(0, 160),
          url: fullUrl,
          jsonLd: combinedJsonLd,
        }));
      }
    }

    // Page tag : /tags/:name
    const tagMatch = req.path.match(/^\/tags\/([^/]+)$/);
    if (tagMatch) {
      const tagName = decodeURIComponent(tagMatch[1]).trim().toLowerCase();
      const tag = await prisma.tag.findUnique({ where: { name: tagName } });
      if (tag) {
        const recipesCount = await prisma.recipeTag.count({
          where: { tagId: tag.id, recipe: { status: 'PUBLISHED' } },
        });
        const title = `Cocktails ${tag.name} — Écume`;
        const description = `Découvrez nos ${recipesCount} recettes de cocktails ${tag.name}. Filtrez, notez et partagez vos cocktails préférés.`;
        const breadcrumbJsonLd = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Accueil', item: siteUrl },
            { '@type': 'ListItem', position: 2, name: 'Tags', item: `${siteUrl}/recipes` },
            { '@type': 'ListItem', position: 3, name: tag.name, item: `${siteUrl}/tags/${encodeURIComponent(tag.name)}` },
          ],
        });
        const collectionJsonLd = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: title,
          description,
          url: `${siteUrl}/tags/${encodeURIComponent(tag.name)}`,
          numberOfItems: recipesCount,
        });
        const combinedJsonLd = `${breadcrumbJsonLd}</script>\n  <script type="application/ld+json">${collectionJsonLd}`;
        return res.send(renderMetaPage({
          title,
          description: description.substring(0, 160),
          url: fullUrl,
          jsonLd: combinedJsonLd,
        }));
      }
    }

    // Catalogue recettes — avec support catégorie et tag
    if (req.path === '/recipes') {
      const categoryParam = req.query.category || req.query.categoryId;
      const tagsParam = req.query.tags;

      // Page filtrée par catégorie
      if (categoryParam) {
        const catId = parseInt(categoryParam, 10);
        if (!isNaN(catId)) {
          const category = await prisma.category.findUnique({ where: { id: catId } });
          if (category) {
            return res.send(renderMetaPage({
              title: `Cocktails ${category.name} — Écume`,
              description: `Découvrez nos recettes de cocktails ${category.name}. Filtrez, notez et partagez vos cocktails préférés.`,
              url: fullUrl,
            }));
          }
        }
      }

      // Page filtrée par tag (un seul tag)
      if (tagsParam) {
        const tagId = parseInt(tagsParam, 10);
        if (!isNaN(tagId)) {
          const tag = await prisma.tag.findUnique({ where: { id: tagId } });
          if (tag) {
            return res.send(renderMetaPage({
              title: `Cocktails ${tag.name} — Écume`,
              description: `Découvrez nos recettes de cocktails ${tag.name}. Filtrez, notez et partagez vos cocktails préférés.`,
              url: fullUrl,
            }));
          }
        }
      }

      // Catalogue générique
      return res.send(renderMetaPage({
        title: 'Catalogue de cocktails — Écume',
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
