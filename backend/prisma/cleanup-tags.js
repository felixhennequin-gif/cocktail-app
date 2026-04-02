/**
 * Script de nettoyage des tags en base de données.
 *
 * Actions :
 * 1. Fusionne les doublons (classic → classique, sans-alcool → sans alcool, holiday → fête)
 * 2. Renomme les tags peu clairs en français
 * 3. Supprime les tags inutiles (alcoholic, dairy, usa)
 * 4. Supprime les tags orphelins (sans aucune recette associée)
 *
 * Usage : node prisma/cleanup-tags.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// Tags à fusionner : { source → cible }
// Les recettes liées au tag source seront rattachées au tag cible, puis le source est supprimé.
const MERGES = {
  'classic': 'classique',
  'sans-alcool': 'sans alcool',
  'holiday': 'fête',
};

// Tags à renommer
const RENAMES = {
  'newera': 'nouvelle vague',
  'contemporaryclassic': 'classique moderne',
  'after-dinner': 'digestif',
  'datenight': 'rendez-vous',
  'sweet': 'sucré',
  'iba': 'IBA officiel',
};

// Tags à supprimer purement (avec leurs associations)
const DELETES = ['alcoholic', 'dairy', 'usa'];

async function mergeTag(sourceName, targetName) {
  const source = await prisma.tag.findUnique({ where: { name: sourceName } });
  const target = await prisma.tag.findUnique({ where: { name: targetName } });
  if (!source) {
    console.log(`  ⏭ "${sourceName}" introuvable, skip`);
    return;
  }
  if (!target) {
    // Le tag cible n'existe pas → simple renommage
    console.log(`  ✏️ "${sourceName}" → "${targetName}" (renommage, cible inexistante)`);
    await prisma.tag.update({ where: { id: source.id }, data: { name: targetName } });
    return;
  }
  // Les deux existent → migrer les associations puis supprimer le source
  const sourceRecipes = await prisma.recipeTag.findMany({ where: { tagId: source.id } });
  const targetRecipes = await prisma.recipeTag.findMany({ where: { tagId: target.id } });
  const targetRecipeIds = new Set(targetRecipes.map(rt => rt.recipeId));

  let moved = 0;
  for (const rt of sourceRecipes) {
    if (!targetRecipeIds.has(rt.recipeId)) {
      await prisma.recipeTag.create({ data: { recipeId: rt.recipeId, tagId: target.id } });
      moved++;
    }
  }
  await prisma.recipeTag.deleteMany({ where: { tagId: source.id } });
  await prisma.tag.delete({ where: { id: source.id } });
  console.log(`  🔀 "${sourceName}" fusionné dans "${targetName}" (${moved} recettes migrées)`);
}

async function renameTag(oldName, newName) {
  const tag = await prisma.tag.findUnique({ where: { name: oldName } });
  if (!tag) {
    console.log(`  ⏭ "${oldName}" introuvable, skip`);
    return;
  }
  // Vérifier qu'il n'y a pas déjà un tag avec le nouveau nom
  const existing = await prisma.tag.findUnique({ where: { name: newName } });
  if (existing) {
    console.log(`  ⚠️ "${newName}" existe déjà — fusion au lieu de renommage`);
    await mergeTag(oldName, newName);
    return;
  }
  await prisma.tag.update({ where: { id: tag.id }, data: { name: newName } });
  console.log(`  ✏️ "${oldName}" → "${newName}"`);
}

async function deleteTag(name) {
  const tag = await prisma.tag.findUnique({ where: { name } });
  if (!tag) {
    console.log(`  ⏭ "${name}" introuvable, skip`);
    return;
  }
  await prisma.recipeTag.deleteMany({ where: { tagId: tag.id } });
  await prisma.tag.delete({ where: { id: tag.id } });
  console.log(`  🗑 "${name}" supprimé`);
}

async function deleteOrphanTags() {
  const orphans = await prisma.tag.findMany({
    where: { recipes: { none: {} } },
  });
  for (const tag of orphans) {
    await prisma.tag.delete({ where: { id: tag.id } });
    console.log(`  🗑 orphelin supprimé : "${tag.name}"`);
  }
  if (orphans.length === 0) console.log('  ✓ Aucun tag orphelin');
}

async function main() {
  console.log('=== Nettoyage des tags ===\n');

  console.log('1. Fusions de doublons...');
  for (const [source, target] of Object.entries(MERGES)) {
    await mergeTag(source, target);
  }

  console.log('\n2. Renommages...');
  for (const [oldName, newName] of Object.entries(RENAMES)) {
    await renameTag(oldName, newName);
  }

  console.log('\n3. Suppressions...');
  for (const name of DELETES) {
    await deleteTag(name);
  }

  console.log('\n4. Nettoyage des tags orphelins...');
  await deleteOrphanTags();

  // Résumé
  const remaining = await prisma.tag.findMany({
    include: { _count: { select: { recipes: true } } },
    orderBy: { name: 'asc' },
  });
  console.log(`\n=== Résultat : ${remaining.length} tags ===`);
  for (const tag of remaining) {
    console.log(`  • ${tag.name} (${tag._count.recipes} recettes)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
