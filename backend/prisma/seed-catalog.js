require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// ──────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────

const MAX_NEW_RECIPES = 50;
const API_DELAY_MS = 300;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

// Mapping catégories TheCocktailDB → catégories locales
const CATEGORY_MAP = {
  'Cocktail': 'Classiques',
  'Ordinary Drink': 'Classiques',
  'Punch / Party Drink': 'Punchs & Sangrias',
  'Shot': 'Modernes',
  'Coffee / Tea': 'Modernes',
  'Soft Drink / Soda': 'Sans alcool',
  'Homemade Liqueur': 'Classiques',
  'Beer': 'Classiques',
  'Shake': 'Sans alcool',
  'Cocoa': 'Sans alcool',
  'Other/Unknown': 'Classiques',
};

// Users existants du seed-realistic
const SEED_USERS = [
  'barman_felix', 'cocktail_addict', 'weekendmixer', 'rhum_lover',
  'soiree_chez_moi', 'ginandtonic_fan', 'la_shakeuseuse', 'zero_alcool',
];

// Pool de commentaires crédibles
const COMMENT_POOL = [
  "Testé ce week-end, excellent résultat !",
  "Un classique indémodable.",
  "Parfait pour un apéro entre amis.",
  "La balance des saveurs est impeccable.",
  "Je recommande avec des glaçons bien froids.",
  "Simple mais efficace, j'adore.",
  "À refaire absolument !",
  "Très bon, j'ai ajouté un peu plus de citron.",
  "Idéal pour une soirée d'été.",
  "Le ratio est parfait, pas besoin de modifier.",
  "Ma nouvelle recette préférée !",
  "Pas mal du tout, je suis agréablement surpris.",
];

// ──────────────────────────────────────────────
// Utilitaires
// ──────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Générateur pseudo-aléatoire avec seed (pour reproductibilité relative)
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// Choisir un élément pondéré parmi des options
function weightedChoice(options, weights, rng) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < options.length; i++) {
    r -= weights[i];
    if (r <= 0) return options[i];
  }
  return options[options.length - 1];
}

// Parser une fraction en décimale
function parseFraction(str) {
  str = str.trim();
  // "1 1/2" → 1.5
  const mixedMatch = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);
  }
  // "1/2" → 0.5
  const fracMatch = str.match(/^(\d+)\/(\d+)$/);
  if (fracMatch) {
    return parseInt(fracMatch[1]) / parseInt(fracMatch[2]);
  }
  // Nombre simple
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

// Parser une mesure en { quantity, unit }
function parseMeasure(measure) {
  if (!measure || !measure.trim()) {
    return { quantity: 1, unit: 'piece' };
  }

  const s = measure.trim();

  // Patterns courants : "1 oz", "2 cl", "1/2 shot", "1 1/2 oz", "Juice of 1"
  const match = s.match(/^([\d\s\/]+)\s*(.+)$/);
  if (match) {
    const qty = parseFraction(match[1]);
    const unit = match[2].trim().toLowerCase();
    if (qty !== null && qty > 0) {
      return { quantity: qty, unit };
    }
  }

  // Cas "Juice of 1" ou texte pur
  const numMatch = s.match(/(\d+[\d\s\/]*)/);
  if (numMatch) {
    const qty = parseFraction(numMatch[1]);
    if (qty !== null && qty > 0) {
      return { quantity: qty, unit: 'piece' };
    }
  }

  return { quantity: 1, unit: 'piece' };
}

// Découper les instructions en étapes
function parseSteps(instructions) {
  if (!instructions) return [];
  return instructions
    .split(/\.\s+/)
    .map(s => s.trim().replace(/\.$/, '').trim())
    .filter(s => s.length > 3)
    .map(s => s.endsWith('.') ? s : s + '.');
}

// Extraire les ingrédients d'un objet cocktail de l'API
function extractIngredients(drink) {
  const ingredients = [];
  for (let i = 1; i <= 15; i++) {
    const name = drink[`strIngredient${i}`];
    if (!name || !name.trim()) break;
    const measure = drink[`strMeasure${i}`];
    const { quantity, unit } = parseMeasure(measure);
    ingredients.push({
      name: name.trim().toLowerCase(),
      quantity,
      unit,
    });
  }
  return ingredients;
}

// Détecter les tags liés aux spiritueux à partir du nom et des ingrédients
function detectSpiritTags(name, ingredients) {
  const tags = [];
  const text = (name + ' ' + ingredients.map(i => i.name).join(' ')).toLowerCase();

  if (/\b(rum|rhum)\b/.test(text)) tags.push('rhum');
  if (/\bgin\b/.test(text)) tags.push('gin');
  if (/\bvodka\b/.test(text)) tags.push('vodka');
  if (/\b(whisky|whiskey|bourbon)\b/.test(text)) tags.push('whisky');
  if (/\btequila\b/.test(text)) tags.push('tequila');

  return tags;
}

// ──────────────────────────────────────────────
// 1. Fetch cocktails depuis TheCocktailDB
// ──────────────────────────────────────────────

async function fetchCocktailsFromAPI() {
  console.log('🌐 Récupération des cocktails depuis TheCocktailDB...');
  const allDrinks = [];

  for (const letter of ALPHABET) {
    let data = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const url = `https://www.thecocktaildb.com/api/json/v1/1/search.php?f=${letter}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        data = await response.json();
        break;
      } catch (err) {
        if (attempt === 0) {
          console.log(`  ⚠ Erreur lettre "${letter}", retry dans 1s...`);
          await sleep(1000);
        } else {
          console.log(`  ✗ Skip lettre "${letter}" : ${err.message}`);
        }
      }
    }

    if (data && data.drinks) {
      allDrinks.push(...data.drinks);
      console.log(`  ${letter.toUpperCase()} → ${data.drinks.length} cocktail(s)`);
    } else {
      console.log(`  ${letter.toUpperCase()} → 0 cocktail(s)`);
    }

    await sleep(API_DELAY_MS);
  }

  console.log(`  Total brut : ${allDrinks.length} cocktails récupérés.\n`);
  return allDrinks;
}

// ──────────────────────────────────────────────
// 2. Filtrage et mapping
// ──────────────────────────────────────────────

function filterAndMapCocktails(drinks, existingNames) {
  const existingSet = new Set(existingNames.map(n => n.toLowerCase()));
  const rng = seededRandom(42);

  const mapped = [];

  // Trier par nom pour ordre alphabétique déterministe
  const sorted = [...drinks].sort((a, b) =>
    (a.strDrink || '').localeCompare(b.strDrink || '')
  );

  for (const drink of sorted) {
    if (mapped.length >= MAX_NEW_RECIPES) break;

    const name = drink.strDrink;
    if (!name) continue;

    // Déjà en base ?
    if (existingSet.has(name.toLowerCase())) continue;

    // Instructions disponibles ?
    const instructions = drink.strInstructionsFR || drink.strInstructions;
    if (!instructions) continue;

    // Extraire les ingrédients
    const ingredients = extractIngredients(drink);
    if (ingredients.length < 2) continue;

    // Catégorie
    const isNonAlcoholic = drink.strAlcoholic === 'Non alcoholic';
    let categoryName;
    if (isNonAlcoholic) {
      categoryName = 'Sans alcool';
    } else {
      categoryName = CATEGORY_MAP[drink.strCategory] || 'Classiques';
    }

    // Difficulté selon nombre d'ingrédients
    let difficulty, prepTime;
    if (ingredients.length <= 3) {
      difficulty = 'EASY'; prepTime = 3;
    } else if (ingredients.length <= 6) {
      difficulty = 'MEDIUM'; prepTime = 5;
    } else {
      difficulty = 'HARD'; prepTime = 8;
    }

    // Steps
    const steps = parseSteps(instructions);
    if (steps.length === 0) continue;

    // Tags
    const tags = [];

    // Tags de l'API
    if (drink.strTags) {
      drink.strTags.split(',').forEach(t => {
        const tag = t.trim().toLowerCase();
        if (tag) tags.push(tag);
      });
    }

    // Tag sans-alcool
    if (isNonAlcoholic) tags.push('sans-alcool');

    // Tags spiritueux
    tags.push(...detectSpiritTags(name, ingredients));

    // Tag saison pondéré : 40% toute-saison, 30% été, 30% hiver
    tags.push(weightedChoice(
      ['toute-saison', 'été', 'hiver'],
      [40, 30, 30],
      rng
    ));

    // Tag occasion pondéré : 40% soirée, 30% apéro, 15% brunch, 15% after-dinner
    tags.push(weightedChoice(
      ['soirée', 'apéro', 'brunch', 'after-dinner'],
      [40, 30, 15, 15],
      rng
    ));

    // Dédupliquer les tags
    const uniqueTags = [...new Set(tags)];

    mapped.push({
      name,
      description: null,
      imageUrl: drink.strDrinkThumb || null,
      difficulty,
      prepTime,
      servings: 1,
      categoryName,
      ingredients,
      steps,
      tags: uniqueTags,
    });
  }

  return mapped;
}

// ──────────────────────────────────────────────
// 3. Seeding des recettes
// ──────────────────────────────────────────────

async function seedRecipes(cocktails) {
  console.log(`🍹 Seeding de ${cocktails.length} nouvelles recettes...\n`);

  // Upsert des catégories nécessaires
  console.log('📂 Upsert des catégories...');
  const categoryNames = [...new Set(cocktails.map(c => c.categoryName))];
  const categoryMap = {};
  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    categoryMap[name] = cat.id;
  }
  console.log(`  ✓ ${categoryNames.length} catégorie(s) prêtes.\n`);

  // Créer les recettes
  let created = 0;
  for (const cocktail of cocktails) {
    // Vérifier qu'elle n'existe pas déjà (idempotence)
    const existing = await prisma.recipe.findFirst({
      where: { name: cocktail.name },
    });
    if (existing) {
      console.log(`  ⏭ ${cocktail.name} (existe déjà)`);
      continue;
    }

    // Upsert des ingrédients
    const ingredientRefs = [];
    for (const ing of cocktail.ingredients) {
      const ingredient = await prisma.ingredient.upsert({
        where: { name: ing.name },
        create: { name: ing.name },
        update: {},
      });
      ingredientRefs.push({
        quantity: ing.quantity,
        unit: ing.unit,
        ingredientId: ingredient.id,
      });
    }

    // Créer la recette avec ingrédients et steps
    const recipe = await prisma.recipe.create({
      data: {
        name: cocktail.name,
        description: cocktail.description,
        imageUrl: cocktail.imageUrl,
        difficulty: cocktail.difficulty,
        prepTime: cocktail.prepTime,
        servings: cocktail.servings,
        status: 'PUBLISHED',
        categoryId: categoryMap[cocktail.categoryName],
        authorId: null,
        ingredients: {
          create: ingredientRefs.map(({ quantity, unit, ingredientId }) => ({
            quantity,
            unit,
            ingredient: { connect: { id: ingredientId } },
          })),
        },
        steps: {
          create: cocktail.steps.map((description, i) => ({
            order: i + 1,
            description,
          })),
        },
      },
    });

    // Upsert des tags et RecipeTag
    for (const tagName of cocktail.tags) {
      const normalizedTag = tagName.trim().toLowerCase();
      const tag = await prisma.tag.upsert({
        where: { name: normalizedTag },
        create: { name: normalizedTag },
        update: {},
      });
      // Vérifier avant de créer pour éviter les doublons
      const existingRT = await prisma.recipeTag.findUnique({
        where: { recipeId_tagId: { recipeId: recipe.id, tagId: tag.id } },
      });
      if (!existingRT) {
        await prisma.recipeTag.create({
          data: { recipeId: recipe.id, tagId: tag.id },
        });
      }
    }

    created++;
    console.log(`  ✓ ${recipe.name} (${cocktail.ingredients.length} ingrédients, ${cocktail.steps.length} étapes, ${cocktail.tags.length} tags)`);
  }

  console.log(`\n  → ${created} recette(s) créée(s).\n`);
  return created;
}

// ──────────────────────────────────────────────
// 4. Tags sur les recettes existantes
// ──────────────────────────────────────────────

async function tagExistingRecipes() {
  console.log('🏷️  Ajout de tags aux recettes existantes...');

  const rng = seededRandom(123);

  // Récupérer toutes les recettes avec leurs ingrédients et tags existants
  const recipes = await prisma.recipe.findMany({
    include: {
      ingredients: { include: { ingredient: true } },
      tags: true,
    },
  });

  // Ne traiter que les recettes sans tags
  const untagged = recipes.filter(r => r.tags.length === 0);
  let taggedCount = 0;

  for (const recipe of untagged) {
    const ingredientNames = recipe.ingredients.map(ri => ri.ingredient.name);
    const tags = [];

    // Détection spiritueux
    tags.push(...detectSpiritTags(recipe.name, ingredientNames.map(n => ({ name: n }))));

    // Saison
    tags.push(weightedChoice(
      ['toute-saison', 'été', 'hiver'],
      [40, 30, 30],
      rng
    ));

    // Occasion
    tags.push(weightedChoice(
      ['soirée', 'apéro', 'brunch', 'after-dinner'],
      [40, 30, 15, 15],
      rng
    ));

    const uniqueTags = [...new Set(tags)];

    for (const tagName of uniqueTags) {
      const normalizedTag = tagName.trim().toLowerCase();
      const tag = await prisma.tag.upsert({
        where: { name: normalizedTag },
        create: { name: normalizedTag },
        update: {},
      });
      const existingRT = await prisma.recipeTag.findUnique({
        where: { recipeId_tagId: { recipeId: recipe.id, tagId: tag.id } },
      });
      if (!existingRT) {
        await prisma.recipeTag.create({
          data: { recipeId: recipe.id, tagId: tag.id },
        });
      }
    }

    taggedCount++;
    console.log(`  ✓ ${recipe.name} → [${uniqueTags.join(', ')}]`);
  }

  console.log(`  → ${taggedCount} recette(s) taguées.\n`);
  return taggedCount;
}

// ──────────────────────────────────────────────
// 5. Preuve sociale (notes + commentaires)
// ──────────────────────────────────────────────

async function seedSocialProof() {
  console.log('⭐ Ajout de preuve sociale (notes + commentaires)...\n');

  const rng = seededRandom(777);

  // Récupérer les users du seed-realistic
  const users = await prisma.user.findMany({
    where: { pseudo: { in: SEED_USERS } },
  });
  if (users.length === 0) {
    console.log('  ⚠ Aucun user trouvé — skip preuve sociale.');
    return { ratings: 0, comments: 0 };
  }
  const userIds = users.map(u => u.id);

  // --- Notes ---
  console.log('  📊 Ajout de notes...');

  // Prendre les 20 premières recettes par ordre alphabétique
  const allRecipes = await prisma.recipe.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { name: 'asc' },
    take: 20,
  });

  let ratingsCreated = 0;
  for (const recipe of allRecipes) {
    // 3 à 6 notes par recette
    const numRatings = 3 + Math.floor(rng() * 4);
    // Shuffle users pour cette recette
    const shuffledUsers = [...userIds].sort(() => rng() - 0.5);

    for (let i = 0; i < Math.min(numRatings, shuffledUsers.length); i++) {
      const userId = shuffledUsers[i];

      // Vérifier qu'il n'y a pas déjà une note
      const existingRating = await prisma.rating.findUnique({
        where: { userId_recipeId: { userId, recipeId: recipe.id } },
      });
      if (existingRating) continue;

      // Distribution : 10% → 3, 30% → 4, 60% → 5
      const score = weightedChoice([3, 4, 5], [10, 30, 60], rng);

      await prisma.rating.create({
        data: { score, userId, recipeId: recipe.id },
      });
      ratingsCreated++;
    }
  }
  console.log(`  ✓ ${ratingsCreated} note(s) ajoutée(s).\n`);

  // --- Commentaires ---
  console.log('  💬 Ajout de commentaires...');

  // Prendre seulement les nouvelles recettes (sans auteur = recettes catalogue)
  const newRecipes = await prisma.recipe.findMany({
    where: { status: 'PUBLISHED', authorId: null },
    orderBy: { name: 'asc' },
  });

  // Sélectionner 10 recettes aléatoires
  const shuffledRecipes = [...newRecipes].sort(() => rng() - 0.5);
  const selectedRecipes = shuffledRecipes.slice(0, Math.min(10, shuffledRecipes.length));

  let commentsCreated = 0;
  const usedComments = new Set();

  for (const recipe of selectedRecipes) {
    // 1 à 2 commentaires par recette
    const numComments = 1 + Math.floor(rng() * 2);
    const shuffledUsers = [...userIds].sort(() => rng() - 0.5);

    for (let i = 0; i < Math.min(numComments, shuffledUsers.length); i++) {
      const userId = shuffledUsers[i];

      // Vérifier qu'il n'y a pas déjà un commentaire (contrainte unique userId+recipeId)
      const existingComment = await prisma.comment.findUnique({
        where: { userId_recipeId: { userId, recipeId: recipe.id } },
      });
      if (existingComment) continue;

      // Choisir un commentaire pas encore utilisé dans ce batch
      let comment;
      const availableComments = COMMENT_POOL.filter(c => !usedComments.has(`${recipe.id}-${c}`));
      if (availableComments.length === 0) continue;
      comment = availableComments[Math.floor(rng() * availableComments.length)];
      usedComments.add(`${recipe.id}-${comment}`);

      await prisma.comment.create({
        data: { content: comment, userId, recipeId: recipe.id },
      });
      commentsCreated++;
    }
  }
  console.log(`  ✓ ${commentsCreated} commentaire(s) ajouté(s).\n`);

  return { ratings: ratingsCreated, comments: commentsCreated };
}

// ──────────────────────────────────────────────
// Script principal
// ──────────────────────────────────────────────

async function main() {
  console.log('🌱 Démarrage du seed catalogue...\n');

  // 1. Fetch depuis l'API
  const drinks = await fetchCocktailsFromAPI();

  // 2. Récupérer les noms de recettes existantes
  const existingRecipes = await prisma.recipe.findMany({ select: { name: true } });
  const existingNames = existingRecipes.map(r => r.name);
  console.log(`📋 ${existingNames.length} recette(s) déjà en base.\n`);

  // 3. Filtrer et mapper
  const cocktails = filterAndMapCocktails(drinks, existingNames);
  console.log(`🎯 ${cocktails.length} cocktail(s) retenus après filtrage.\n`);

  if (cocktails.length === 0) {
    console.log('Aucune nouvelle recette à ajouter. Fin.');
    return;
  }

  // 4. Seed des recettes
  const newCount = await seedRecipes(cocktails);

  // 5. Tags sur les recettes existantes
  const taggedCount = await tagExistingRecipes();

  // 6. Preuve sociale
  const { ratings, comments } = await seedSocialProof();

  // Résumé final
  const totalRecipes = await prisma.recipe.count();
  const totalTags = await prisma.tag.count();
  const totalRatings = await prisma.rating.count();
  const totalComments = await prisma.comment.count();

  console.log('═══════════════════════════════════════════');
  console.log('📊 Résumé');
  console.log('═══════════════════════════════════════════');
  console.log(`  Recettes en base    : ${totalRecipes} (dont ${newCount} nouvelles)`);
  console.log(`  Tags en base        : ${totalTags}`);
  console.log(`  Notes en base       : ${totalRatings} (dont ${ratings} nouvelles)`);
  console.log(`  Commentaires en base: ${totalComments} (dont ${comments} nouveaux)`);
  console.log(`  Recettes taguées    : ${taggedCount} (existantes sans tags)`);
  console.log('═══════════════════════════════════════════');
  console.log('\n✅ Seed catalogue terminé !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur fatale :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
