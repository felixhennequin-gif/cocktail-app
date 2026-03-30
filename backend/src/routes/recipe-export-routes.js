const { Router } = require('express');
const PDFDocument = require('pdfkit');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const prisma = require('../prisma');
const { getCache, setCache } = require('../cache');

const router = Router();
const SITE_URL = process.env.SITE_URL || 'https://cocktail-app.fr';
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

// Charger la recette complète avec toutes les relations
async function loadRecipe(id) {
  return prisma.recipe.findUnique({
    where: { id },
    include: {
      category: true,
      author: true,
      ingredients: { include: { ingredient: true } },
      steps: { orderBy: { order: 'asc' } },
      tags: { include: { tag: true } },
      _count: { select: { favorites: true } },
    },
  });
}

// GET /recipes/:id/pdf — Export PDF d'une recette
router.get('/:id/pdf', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'id invalide' });

    const recipe = await loadRecipe(id);
    if (!recipe || recipe.status !== 'PUBLISHED') {
      return res.status(404).json({ error: 'Recette introuvable' });
    }

    // Note moyenne
    const agg = await prisma.rating.aggregate({
      where: { recipeId: id },
      _avg: { score: true },
      _count: { score: true },
    });

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${recipe.name.replace(/[^a-zA-Z0-9À-ÿ\s-]/g, '')}.pdf"`);
    doc.pipe(res);

    // Titre
    doc.fontSize(24).font('Helvetica-Bold').text(recipe.name, { align: 'center' });
    doc.moveDown(0.5);

    // Méta : difficulté, temps, catégorie, auteur
    const difficultyMap = { EASY: 'Facile', MEDIUM: 'Moyen', HARD: 'Difficile' };
    const meta = [];
    meta.push(`Difficulté : ${difficultyMap[recipe.difficulty] || recipe.difficulty}`);
    if (recipe.prepTime) meta.push(`Temps : ${recipe.prepTime} min`);
    if (recipe.category) meta.push(`Catégorie : ${recipe.category.name}`);
    if (recipe.author) meta.push(`Par : ${recipe.author.pseudo}`);
    if (agg._avg.score) meta.push(`Note : ${agg._avg.score.toFixed(1)}/5 (${agg._count.score} avis)`);
    if (recipe.servings) meta.push(`Portions : ${recipe.servings}`);

    doc.fontSize(10).font('Helvetica').fillColor('#666666').text(meta.join('  |  '), { align: 'center' });
    doc.moveDown(0.5);

    // Tags
    if (recipe.tags?.length > 0) {
      const tagNames = recipe.tags.map((t) => t.tag.name).join(', ');
      doc.fontSize(9).fillColor('#999999').text(`Tags : ${tagNames}`, { align: 'center' });
      doc.moveDown(0.5);
    }

    // Description
    if (recipe.description) {
      doc.fillColor('#333333').fontSize(11).font('Helvetica').text(recipe.description);
      doc.moveDown(1);
    }

    // Ligne séparatrice
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E5E5E5').stroke();
    doc.moveDown(0.5);

    // Ingrédients
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000').text('Ingrédients');
    doc.moveDown(0.3);
    for (const ri of recipe.ingredients) {
      const qty = ri.quantity ? `${ri.quantity} ${ri.unit || ''}`.trim() : '';
      const line = qty ? `${qty} — ${ri.ingredient.name}` : ri.ingredient.name;
      doc.fontSize(11).font('Helvetica').fillColor('#333333').text(`• ${line}`);
    }
    doc.moveDown(1);

    // Étapes
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000').text('Préparation');
    doc.moveDown(0.3);
    for (const step of recipe.steps) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#B8860B').text(`Étape ${step.order}`, { continued: true });
      doc.font('Helvetica').fillColor('#333333').text(`  ${step.description}`);
      doc.moveDown(0.3);
    }

    // Footer
    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E5E5E5').stroke();
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('#999999').text(
      `${SITE_URL}/recipes/${recipe.id}  •  Cocktail App`,
      { align: 'center' }
    );

    doc.end();
  } catch (err) {
    console.error('[pdf] Erreur:', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Erreur génération PDF' });
  }
});

// GET /recipes/:id/og-image — Image OG dynamique 1200x630
router.get('/:id/og-image', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'id invalide' });

    // Cache Redis (24h)
    const cacheKey = `og-image:${id}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(Buffer.from(cached, 'base64'));
    }

    const recipe = await loadRecipe(id);
    if (!recipe || recipe.status !== 'PUBLISHED') {
      return res.status(404).json({ error: 'Recette introuvable' });
    }

    const agg = await prisma.rating.aggregate({
      where: { recipeId: id },
      _avg: { score: true },
      _count: { score: true },
    });

    const WIDTH = 1200;
    const HEIGHT = 630;

    // Créer l'image de fond
    let background;
    if (recipe.imageUrl) {
      const imagePath = path.join(uploadsDir, recipe.imageUrl.replace('/uploads/', ''));
      if (fs.existsSync(imagePath)) {
        background = await sharp(imagePath)
          .resize(WIDTH, HEIGHT, { fit: 'cover' })
          .modulate({ brightness: 0.5 })
          .toBuffer();
      }
    }

    if (!background) {
      // Dégradé doré si pas d'image
      background = await sharp({
        create: { width: WIDTH, height: HEIGHT, channels: 4, background: { r: 30, g: 25, b: 15, alpha: 255 } },
      }).png().toBuffer();
    }

    // Overlay avec gradient sombre en bas
    const overlay = Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(0,0,0,0.3)" />
            <stop offset="50%" stop-color="rgba(0,0,0,0.5)" />
            <stop offset="100%" stop-color="rgba(0,0,0,0.85)" />
          </linearGradient>
        </defs>
        <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#grad)" />
      </svg>
    `);

    // Texte SVG
    const escapeSvg = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const name = escapeSvg(recipe.name);
    const stars = agg._avg.score ? '★'.repeat(Math.round(agg._avg.score)) + '☆'.repeat(5 - Math.round(agg._avg.score)) : '';
    const ratingText = agg._avg.score ? `${agg._avg.score.toFixed(1)}/5 (${agg._count.score} avis)` : '';
    const difficultyMap = { EASY: 'Facile', MEDIUM: 'Moyen', HARD: 'Difficile' };
    const meta = [difficultyMap[recipe.difficulty], recipe.prepTime ? `${recipe.prepTime} min` : '', recipe.category?.name].filter(Boolean).join('  •  ');

    const textSvg = Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}">
        <text x="60" y="420" font-family="sans-serif" font-size="56" font-weight="bold" fill="white">${name}</text>
        ${stars ? `<text x="60" y="480" font-family="sans-serif" font-size="32" fill="#FFD700">${stars}  <tspan fill="#cccccc" font-size="24">${ratingText}</tspan></text>` : ''}
        <text x="60" y="530" font-family="sans-serif" font-size="24" fill="#cccccc">${escapeSvg(meta)}</text>
        <text x="60" y="590" font-family="sans-serif" font-size="20" fill="#B8860B">cocktail-app.fr</text>
        ${recipe.author ? `<text x="${WIDTH - 60}" y="590" font-family="sans-serif" font-size="20" fill="#999999" text-anchor="end">par ${escapeSvg(recipe.author.pseudo)}</text>` : ''}
      </svg>
    `);

    const image = await sharp(background)
      .composite([
        { input: overlay, blend: 'over' },
        { input: textSvg, blend: 'over' },
      ])
      .png()
      .toBuffer();

    // Cache en base64 dans Redis (24h)
    await setCache(cacheKey, image.toString('base64'), 86400);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(image);
  } catch (err) {
    console.error('[og-image] Erreur:', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Erreur génération OG image' });
  }
});

module.exports = router;
