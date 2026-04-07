// Fetch et seed des cocktails depuis TheCocktailDB vers la base Prisma.
// Parcourt l'alphabet (a-z) pour couvrir le catalogue complet.
// Utilise upsert sur le slug pour éviter les doublons au re-run.

const prisma = require('../prisma');
const { slugify } = require('../utils/slugify');

const BASE_URL = 'https://www.thecocktaildb.com/api/json/v1/1/search.php';

// Parse une mesure type "1 1/2 oz" en { quantity: number, unit: string }
const parseMeasure = (measure) => {
  if (!measure || !measure.trim()) return { quantity: 0, unit: '' };
  const text = measure.trim();

  // Fractions courantes
  const fractions = { '1/2': 0.5, '1/3': 0.33, '2/3': 0.67, '1/4': 0.25, '3/4': 0.75, '1/8': 0.125 };

  // Pattern: "1 1/2 oz", "2 cl", "Juice of 1"
  const match = text.match(/^(\d+)?\s*(\d+\/\d+)?\s*(.*)$/);
  if (!match) return { quantity: 0, unit: text };

  let qty = 0;
  if (match[1]) qty += parseInt(match[1]);
  if (match[2]) qty += fractions[match[2]] || 0;

  const unit = (match[3] || '').trim();

  // Si pas de nombre trouvé mais du texte, c'est probablement "Juice of 1", etc.
  if (qty === 0 && unit) return { quantity: 1, unit };

  return { quantity: qty || 1, unit: unit || 'pièce' };
};

// Mappe un cocktail TheCocktailDB vers nos structures Prisma
const mapCocktail = (drink) => {
  const name = drink.strDrink?.trim();
  if (!name) return null;

  // Extraire les ingrédients (strIngredient1..15 / strMeasure1..15)
  const ingredients = [];
  for (let i = 1; i <= 15; i++) {
    const ingName = drink[`strIngredient${i}`]?.trim();
    if (!ingName) break;
    const { quantity, unit } = parseMeasure(drink[`strMeasure${i}`]);
    ingredients.push({ name: ingName, quantity, unit });
  }

  // Tags (strTags est une chaîne séparée par virgules, peut être null)
  const tags = drink.strTags
    ? drink.strTags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
    : [];

  // Instructions (peut être null)
  const instructions = drink.strInstructions?.trim() || null;

  return {
    name,
    slug: slugify(name),
    description: null,
    imageUrl: drink.strDrinkThumb || null,
    difficulty: 'EASY',
    prepTime: 5,
    categoryName: drink.strCategory?.trim() || 'Cocktails',
    ingredients,
    instructions,
    tags,
    // Champs ignorés (pas dans le schema) : strGlass, strAlcoholic, strVideo, strIBA, etc.
  };
};

// Fetch une lettre de l'alphabet
const fetchLetter = async (letter) => {
  const url = `${BASE_URL}?f=${letter}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
  const data = await res.json();
  return data.drinks || [];
};

// Seed principal
const seedCocktails = async () => {
  const report = { inserted: 0, updated: 0, skipped: 0, errors: [] };
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const allDrinks = [];

  // Fetch toutes les lettres
  for (const letter of letters) {
    try {
      const drinks = await fetchLetter(letter);
      allDrinks.push(...drinks);
    } catch (err) {
      report.errors.push({ letter, message: err.message });
    }
  }

  // Dédupliquer par nom (certains cocktails apparaissent dans plusieurs lettres)
  const seen = new Set();
  const uniqueDrinks = allDrinks.filter((d) => {
    const key = d.strDrink?.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Upsert chaque cocktail
  for (const drink of uniqueDrinks) {
    try {
      const mapped = mapCocktail(drink);
      if (!mapped) { report.skipped++; continue; }

      // Upsert catégorie
      const category = await prisma.category.upsert({
        where: { name: mapped.categoryName },
        create: { name: mapped.categoryName, slug: slugify(mapped.categoryName) },
        update: {},
      });

      // Upsert ingrédients
      const ingredientRecords = [];
      for (const ing of mapped.ingredients) {
        const ingredient = await prisma.ingredient.upsert({
          where: { name: ing.name },
          create: { name: ing.name },
          update: {},
        });
        ingredientRecords.push({ ingredientId: ingredient.id, quantity: ing.quantity, unit: ing.unit });
      }

      // Upsert tags
      const tagRecords = [];
      for (const tagName of mapped.tags) {
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          create: { name: tagName },
          update: {},
        });
        tagRecords.push(tag.id);
      }

      // Vérifier si la recette existe déjà (par slug)
      const existing = await prisma.recipe.findUnique({ where: { slug: mapped.slug } });

      if (existing) {
        // Update la recette existante
        await prisma.recipe.update({
          where: { slug: mapped.slug },
          data: {
            name: mapped.name,
            imageUrl: mapped.imageUrl,
            categoryId: category.id,
          },
        });
        report.updated++;
      } else {
        // Créer la recette avec ses relations
        await prisma.recipe.create({
          data: {
            name: mapped.name,
            slug: mapped.slug,
            description: mapped.description,
            imageUrl: mapped.imageUrl,
            difficulty: mapped.difficulty,
            prepTime: mapped.prepTime,
            status: 'PUBLISHED',
            categoryId: category.id,
            ingredients: {
              create: ingredientRecords,
            },
            steps: mapped.instructions ? {
              create: [{ order: 1, description: mapped.instructions }],
            } : undefined,
            tags: tagRecords.length > 0 ? {
              create: tagRecords.map((tagId) => ({ tag: { connect: { id: tagId } } })),
            } : undefined,
          },
        });
        report.inserted++;
      }
    } catch (err) {
      report.errors.push({ drink: drink.strDrink, message: err.message });
    }
  }

  return report;
};

module.exports = { seedCocktails };
