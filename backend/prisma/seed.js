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
    'TRUNCATE "RecipeIngredient", "Step", "Recipe", "Ingredient", "Category" RESTART IDENTITY CASCADE'
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

  console.log(`\nSeed terminé : ${data.recipes.length} recettes insérées.`);
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
