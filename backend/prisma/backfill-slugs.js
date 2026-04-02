require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const { generateRecipeSlug, uniqueSlug } = require('../src/utils/slugify');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function backfill() {
  const recipes = await prisma.recipe.findMany({
    where: { slug: null },
    include: { author: { select: { pseudo: true } } },
    orderBy: { id: 'asc' },
  });

  console.log(`${recipes.length} recettes sans slug à traiter...`);

  for (const recipe of recipes) {
    const baseSlug = generateRecipeSlug(recipe.name, recipe.author?.pseudo);
    const slug = await uniqueSlug(baseSlug, prisma, 'recipe', recipe.id);
    await prisma.recipe.update({ where: { id: recipe.id }, data: { slug } });
    console.log(`  ✓ #${recipe.id} ${recipe.name} → ${slug}`);
  }

  console.log('Backfill terminé.');
  await prisma.$disconnect();
  await pool.end();
}

backfill().catch((err) => {
  console.error('Erreur backfill:', err);
  process.exit(1);
});
