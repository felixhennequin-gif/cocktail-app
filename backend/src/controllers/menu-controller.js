const PDFDocument = require('pdfkit');
const prisma = require('../prisma');
const { badRequest } = require('../helpers');
const { generateMenuSchema, formatZodError } = require('../schemas');

// POST /menus/generate — génère un PDF de menu cocktails
const generateMenu = async (req, res, next) => {
  try {
    const parsed = generateMenuSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, formatZodError(parsed.error));
    const { title, recipeIds, template, showIngredients } = parsed.data;

    const ids = recipeIds.map(Number).filter((n) => n > 0);
    const recipes = await prisma.recipe.findMany({
      where: { id: { in: ids }, status: 'PUBLISHED' },
      include: {
        ingredients: { include: { ingredient: true } },
        category: true,
      },
    });

    if (recipes.length === 0) return badRequest(res, 'Aucune recette trouvée');

    // Ordonner selon l'ordre demandé
    const ordered = ids.map((id) => recipes.find((r) => r.id === id)).filter(Boolean);

    // Configuration des templates
    const templates = {
      elegant:  { bg: '#1a1a1a', text: '#d4a047', accent: '#f5c96c', font: 'Helvetica-Bold' },
      tropical: { bg: '#fff8e1', text: '#2e7d32', accent: '#ff6f00', font: 'Helvetica' },
      minimal:  { bg: '#ffffff', text: '#1a1a1a', accent: '#666666', font: 'Helvetica' },
    };
    const t = templates[template] || templates.elegant;

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="menu-cocktails.pdf"`);
    doc.pipe(res);

    // Fond
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(t.bg);

    // Titre
    doc.fillColor(t.text).font(t.font).fontSize(28).text(title, { align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor(t.accent).fontSize(10).text('───────────────────────', { align: 'center' });
    doc.moveDown(1);

    // Recettes
    for (const recipe of ordered) {
      // Vérifier s'il reste assez de place (au moins 80px)
      if (doc.y > doc.page.height - 120) {
        doc.addPage();
        doc.rect(0, 0, doc.page.width, doc.page.height).fill(t.bg);
        doc.fillColor(t.text);
      }

      doc.fillColor(t.text).font(t.font).fontSize(16).text(recipe.name);
      doc.moveDown(0.2);

      // Description courte
      if (recipe.description) {
        const short = recipe.description.substring(0, 120) + (recipe.description.length > 120 ? '...' : '');
        doc.fillColor(t.accent).font('Helvetica').fontSize(10).text(short);
      }

      // Meta
      doc.fillColor(t.accent).fontSize(9).text(
        `${recipe.difficulty} · ${recipe.prepTime} min · ${recipe.category?.name || ''}`,
      );

      // Ingrédients
      if (showIngredients !== false && recipe.ingredients.length > 0) {
        doc.moveDown(0.3);
        const ingText = recipe.ingredients
          .map((ri) => `${ri.quantity} ${ri.unit} ${ri.ingredient.name}`)
          .join('  ·  ');
        doc.fillColor(t.accent).fontSize(8).text(ingText);
      }

      doc.moveDown(0.8);
    }

    // Footer
    doc.moveDown(1);
    doc.fillColor(t.accent).fontSize(10).text('───────────────────────', { align: 'center' });
    doc.moveDown(0.3);
    doc.fillColor(t.accent).fontSize(8).text('Recettes sur Écume — cocktail-app.fr', { align: 'center' });

    doc.end();
  } catch (err) {
    next(err);
  }
};

module.exports = { generateMenu };
