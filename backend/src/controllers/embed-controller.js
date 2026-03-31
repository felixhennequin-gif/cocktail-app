const prisma = require('../prisma');

// GET /embed/recipes/:id — page HTML autonome pour iframe
const getRecipeEmbed = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('id invalide');

    const recipe = await prisma.recipe.findUnique({
      where: { id, status: 'PUBLISHED' },
      include: {
        category: true,
        ingredients: { include: { ingredient: true } },
      },
    });

    if (!recipe) return res.status(404).send('Recette introuvable');

    const ratingAgg = await prisma.rating.aggregate({
      where: { recipeId: id },
      _avg: { score: true },
      _count: { score: true },
    });

    const avgRating = ratingAgg._avg.score
      ? Math.round(ratingAgg._avg.score * 10) / 10
      : null;

    const theme = req.query.theme === 'dark' ? 'dark' : 'light';
    const showIngredients = req.query.showIngredients !== 'false';
    const baseUrl = process.env.BASE_URL || 'https://cocktail-app.fr';

    const bgColor = theme === 'dark' ? '#1a1a2e' : '#ffffff';
    const textColor = theme === 'dark' ? '#e0e0e0' : '#1a1a1a';
    const mutedColor = theme === 'dark' ? '#888' : '#666';
    const borderColor = theme === 'dark' ? '#333' : '#e5e5e5';
    const accentColor = '#D4A047';

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(recipe.name)} — cocktail-app</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${bgColor}; color: ${textColor};
      padding: 16px; max-width: 400px;
    }
    .card { border: 1px solid ${borderColor}; border-radius: 12px; overflow: hidden; }
    .img { width: 100%; height: 180px; object-fit: cover; }
    .content { padding: 16px; }
    h1 { font-size: 18px; margin-bottom: 8px; }
    .meta { display: flex; gap: 12px; font-size: 13px; color: ${mutedColor}; margin-bottom: 12px; }
    .ingredients { list-style: none; font-size: 13px; }
    .ingredients li { padding: 6px 0; border-bottom: 1px solid ${borderColor}; display: flex; justify-content: space-between; }
    .ingredients li:last-child { border-bottom: none; }
    .footer { padding: 12px 16px; border-top: 1px solid ${borderColor}; text-align: center; }
    .footer a { color: ${accentColor}; text-decoration: none; font-size: 13px; font-weight: 600; }
    .footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    ${recipe.imageUrl ? `<img class="img" src="${escapeHtml(recipe.imageUrl.startsWith('/') ? baseUrl + recipe.imageUrl : recipe.imageUrl)}" alt="${escapeHtml(recipe.name)}">` : ''}
    <div class="content">
      <h1>${escapeHtml(recipe.name)}</h1>
      <div class="meta">
        <span>${recipe.difficulty}</span>
        <span>${recipe.prepTime} min</span>
        ${avgRating ? `<span>★ ${avgRating}</span>` : ''}
        ${recipe.category ? `<span>${escapeHtml(recipe.category.name)}</span>` : ''}
      </div>
      ${recipe.description ? `<p style="font-size:13px;color:${mutedColor};margin-bottom:12px">${escapeHtml(recipe.description).substring(0, 150)}${recipe.description.length > 150 ? '...' : ''}</p>` : ''}
      ${showIngredients && recipe.ingredients.length > 0 ? `
        <ul class="ingredients">
          ${recipe.ingredients.map((ri) => `<li><span>${escapeHtml(ri.ingredient.name)}</span><span style="color:${mutedColor}">${ri.quantity} ${escapeHtml(ri.unit)}</span></li>`).join('')}
        </ul>
      ` : ''}
    </div>
    <div class="footer">
      <a href="${baseUrl}/recipes/${recipe.id}" target="_blank" rel="noopener">Voir sur cocktail-app.fr →</a>
    </div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.send(html);
  } catch (err) {
    next(err);
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = { getRecipeEmbed };
