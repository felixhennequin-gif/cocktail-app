require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const data = require('./seed-data.json');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function seed() {
  console.log('Nettoyage des données existantes...');
  // TRUNCATE remet les séquences à zéro (IDs stables à chaque re-seed)
  await pool.query(
    'TRUNCATE "CollectionRecipe", "Collection", "RecipeTag", "Tag", "RecipeIngredient", "Step", "Recipe", "Ingredient", "Category" RESTART IDENTITY CASCADE'
  );

  console.log('Création des catégories...');
  // Créer toutes les catégories et les indexer par nom
  const categoryMap = {};
  for (const name of data.categories) {
    const category = await prisma.category.create({ data: { name } });
    categoryMap[name] = category.id;
  }

  console.log('Extraction et création des ingrédients...');
  // Dédupliquer les ingrédients à travers toutes les recettes
  const ingredientNames = [...new Set(data.recipes.flatMap(r => r.ingredients.map(i => i.name)))];
  const ingredientMap = {};
  for (const name of ingredientNames) {
    const ingredient = await prisma.ingredient.create({ data: { name } });
    ingredientMap[name] = ingredient.id;
  }

  console.log('Création des recettes...');
  for (const recette of data.recipes) {
    const recipe = await prisma.recipe.create({
      data: {
        name:        recette.name,
        description: recette.description,
        difficulty:  recette.difficulty,
        prepTime:    recette.prepTime,
        imageUrl:    recette.imageUrl || null,
        categoryId:  categoryMap[recette.category],
        ingredients: {
          create: recette.ingredients.map(({ name, quantity, unit }) => ({
            quantity,
            unit,
            ingredient: { connect: { id: ingredientMap[name] } },
          })),
        },
        steps: {
          create: recette.steps.map(({ order, description }) => ({ order, description })),
        },
      },
    });
    console.log(`  ✓ ${recipe.name}`);
  }

  // Tags par défaut
  console.log('Création des tags...');
  const defaultTags = ['été', 'hiver', 'fête', 'brunch', 'sans alcool', 'rapide', 'classique', 'tropical', 'after-dinner'];
  const tagMap = {};
  for (const name of defaultTags) {
    const tag = await prisma.tag.create({ data: { name } });
    tagMap[name] = tag.id;
    console.log(`  ✓ tag: ${name}`);
  }

  // Associer quelques tags aux recettes existantes
  const tagAssociations = {
    'Mojito':         ['été', 'tropical', 'fête', 'rapide'],
    'Old Fashioned':  ['classique', 'hiver', 'after-dinner'],
    'Negroni':        ['classique', 'after-dinner'],
    'Aperol Spritz':  ['été', 'fête', 'brunch', 'rapide'],
    'Piña Colada':    ['été', 'tropical', 'fête'],
    'Moscow Mule':    ['fête', 'rapide'],
    'Daiquiri':       ['classique', 'tropical', 'rapide'],
    'Manhattan':      ['classique', 'hiver', 'after-dinner'],
    'Mai Tai':        ['tropical', 'été', 'fête'],
    'Cosmopolitan':   ['classique', 'fête'],
  };
  console.log('Association des tags aux recettes...');
  for (const [recipeName, tags] of Object.entries(tagAssociations)) {
    const recipe = await prisma.recipe.findFirst({ where: { name: recipeName } });
    if (!recipe) continue;
    for (const tagName of tags) {
      await prisma.recipeTag.create({
        data: { recipeId: recipe.id, tagId: tagMap[tagName] },
      });
    }
    console.log(`  ✓ ${recipeName}: ${tags.join(', ')}`);
  }

  console.log(`\nSeed terminé : ${data.recipes.length} recettes, ${defaultTags.length} tags insérés.`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
