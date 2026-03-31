/**
 * Script d'import de recettes depuis TheCocktailDB API
 * Usage : cd backend && npm run import:cocktaildb
 *
 * Parcourt l'API lettre par lettre (a-z), mappe chaque cocktail
 * vers le schéma Prisma existant et l'insère en base.
 * Les doublons (même nom) sont ignorés.
 */

require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const API_BASE = 'https://www.thecocktaildb.com/api/json/v1/1/search.php';
const DELAY_MS = 500; // Délai entre chaque requête pour ne pas surcharger l'API

/**
 * Pause de `ms` millisecondes
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extrait les ingrédients et mesures d'un objet cocktail de l'API.
 * L'API fournit strIngredient1..15 et strMeasure1..15.
 * On s'arrête au premier ingrédient null/vide.
 */
function extractIngredients(drink) {
  const ingredients = [];
  for (let i = 1; i <= 15; i++) {
    const name = drink[`strIngredient${i}`];
    if (!name || !name.trim()) break;

    const measure = drink[`strMeasure${i}`] || '';
    ingredients.push({
      name: name.trim(),
      measure: measure.trim(),
    });
  }
  return ingredients;
}

/**
 * Détermine la difficulté en fonction du nombre d'ingrédients :
 * - < 4  : EASY
 * - 4-7  : MEDIUM
 * - > 7  : HARD
 */
function getDifficulty(ingredientCount) {
  if (ingredientCount < 4) return 'EASY';
  if (ingredientCount <= 7) return 'MEDIUM';
  return 'HARD';
}

/**
 * Estime le temps de préparation (en minutes) :
 * 5 min par ingrédient comme base.
 */
function estimatePrepTime(ingredientCount) {
  return Math.max(5, ingredientCount * 5);
}

/**
 * Parse une mesure brute en { quantity, unit }.
 * Exemples : "1 1/2 oz" → { quantity: "1 1/2", unit: "oz" }
 *            "Juice of 1" → { quantity: "1", unit: "Juice of" }
 *            "" → { quantity: "", unit: "" }
 */
function parseMeasure(measure) {
  if (!measure) return { quantity: '', unit: '' };

  // Cherche un pattern numérique au début (entier, fraction, décimal)
  const match = measure.match(/^([\d]+\s*[\d/]*[\d.]*)\s*(.*)/);
  if (match) {
    return {
      quantity: match[1].trim(),
      unit: match[2].trim(),
    };
  }

  // Pas de nombre trouvé — tout va dans unit
  return { quantity: '', unit: measure };
}

/**
 * Importe tous les cocktails depuis TheCocktailDB
 */
async function importAll() {
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  // Cache local pour éviter les requêtes Prisma redondantes
  const categoryCache = new Map();
  const ingredientCache = new Map();

  // Récupérer les noms de recettes existantes pour détecter les doublons
  const existingRecipes = await prisma.recipe.findMany({
    select: { name: true },
  });
  const existingNames = new Set(existingRecipes.map((r) => r.name.toLowerCase()));

  console.log(`Recettes déjà en base : ${existingNames.size}`);
  console.log('Début de l\'import depuis TheCocktailDB...\n');

  for (const letter of letters) {
    const url = `${API_BASE}?f=${letter}`;
    console.log(`Récupération lettre "${letter}"...`);

    let data;
    try {
      const response = await fetch(url);
      data = await response.json();
    } catch (err) {
      console.error(`  Erreur réseau pour la lettre "${letter}" : ${err.message}`);
      errors++;
      await sleep(DELAY_MS);
      continue;
    }

    const drinks = data.drinks || [];
    console.log(`  ${drinks.length} cocktail(s) trouvé(s)`);

    for (const drink of drinks) {
      const cocktailName = drink.strDrink?.trim();
      if (!cocktailName) continue;

      // Vérification doublon
      if (existingNames.has(cocktailName.toLowerCase())) {
        console.log(`  ⏭ "${cocktailName}" — déjà en base, ignoré`);
        skipped++;
        continue;
      }

      try {
        // --- Catégorie (upsert) ---
        const categoryName = drink.strCategory?.trim() || 'Other / Unknown';
        let categoryId = categoryCache.get(categoryName);
        if (!categoryId) {
          const slug = categoryName.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
          const category = await prisma.category.upsert({
            where: { name: categoryName },
            update: {},
            create: { name: categoryName, slug },
          });
          categoryId = category.id;
          categoryCache.set(categoryName, categoryId);
        }

        // --- Ingrédients ---
        const rawIngredients = extractIngredients(drink);
        const ingredientData = [];

        for (const raw of rawIngredients) {
          let ingredientId = ingredientCache.get(raw.name.toLowerCase());
          if (!ingredientId) {
            const ingredient = await prisma.ingredient.upsert({
              where: { name: raw.name },
              update: {},
              create: { name: raw.name },
            });
            ingredientId = ingredient.id;
            ingredientCache.set(raw.name.toLowerCase(), ingredientId);
          }

          const { quantity, unit } = parseMeasure(raw.measure);
          ingredientData.push({ ingredientId, quantity, unit });
        }

        // --- Difficulté et temps ---
        const difficulty = getDifficulty(rawIngredients.length);
        const prepTime = estimatePrepTime(rawIngredients.length);

        // --- Instructions (étape unique) ---
        const instructions = drink.strInstructions?.trim() || '';

        // --- Création de la recette ---
        await prisma.recipe.create({
          data: {
            name: cocktailName,
            description: instructions || null,
            imageUrl: drink.strDrinkThumb || null,
            difficulty,
            prepTime,
            servings: 1,
            status: 'PUBLISHED',
            authorId: null,
            categoryId,
            ingredients: {
              create: ingredientData.map((ing) => ({
                ingredientId: ing.ingredientId,
                quantity: ing.quantity,
                unit: ing.unit,
              })),
            },
            steps: {
              create: instructions
                ? [{ order: 1, description: instructions }]
                : [],
            },
          },
        });

        // Ajouter au set pour éviter les doublons intra-import
        existingNames.add(cocktailName.toLowerCase());
        imported++;
        console.log(`  ✓ "${cocktailName}" importé (${difficulty}, ${rawIngredients.length} ingrédients)`);
      } catch (err) {
        console.error(`  ✗ Erreur pour "${cocktailName}" : ${err.message}`);
        errors++;
      }
    }

    // Délai entre chaque lettre pour respecter le rate limit de l'API
    await sleep(DELAY_MS);
  }

  console.log('\n--- Résumé de l\'import ---');
  console.log(`Importés : ${imported}`);
  console.log(`Ignorés (doublons) : ${skipped}`);
  console.log(`Erreurs : ${errors}`);
}

importAll()
  .catch((err) => {
    console.error('Erreur fatale :', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
