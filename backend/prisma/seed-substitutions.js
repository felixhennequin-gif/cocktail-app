// Seed des substitutions d'ingrédients courantes
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // Substitutions courantes : [ingrédient, substitut, ratio, notes]
  const substitutions = [
    ['Vodka', 'Gin', 1.0, 'Le gin apporte des arômes botaniques en plus'],
    ['Campari', 'Aperol', 1.0, 'L\'Aperol est plus doux et moins amer'],
    ['Citron vert', 'Citron jaune', 1.0, 'Saveur légèrement différente mais fonctionne'],
    ['Sirop de sucre', 'Miel', 0.75, 'Le miel est plus sucré, réduire la quantité'],
    ['Sirop de sucre', 'Sirop d\'agave', 0.75, 'L\'agave est plus sucré, réduire la quantité'],
    ['Triple sec', 'Cointreau', 1.0, 'Le Cointreau est un triple sec premium'],
    ['Triple sec', 'Grand Marnier', 1.0, 'Le Grand Marnier apporte des notes d\'orange plus complexes'],
    ['Rhum blanc', 'Cachaça', 1.0, 'La cachaça est un rhum brésilien, saveur similaire'],
    ['Bourbon', 'Rye whiskey', 1.0, 'Le rye est plus épicé, le bourbon plus doux'],
    ['Angostura bitters', 'Peychaud\'s bitters', 1.0, 'Profil aromatique différent mais compatible'],
    ['Jus d\'orange', 'Jus de mandarine', 1.0, 'Saveur similaire, plus douce'],
    ['Tonic', 'Eau gazeuse', 1.0, 'Perd l\'amertume du quinine'],
    ['Menthe fraîche', 'Basilic frais', 1.0, 'Le basilic apporte une note différente mais intéressante'],
    ['Sirop de grenadine', 'Sirop de framboise', 1.0, 'Couleur et saveur similaires'],
    ['Marasquin', 'Kirsch', 1.0, 'Les deux sont des liqueurs de cerise'],
    ['Crème de cacao', 'Cacao en poudre', 0.5, 'Mélanger avec du sirop de sucre pour compenser'],
    ['Rhum ambré', 'Rhum vieux', 1.0, 'Le rhum vieux est plus complexe'],
    ['Whisky', 'Bourbon', 1.0, 'Le bourbon est un type de whisky américain'],
    ['Tequila', 'Mezcal', 1.0, 'Le mezcal est plus fumé'],
    ['Prosecco', 'Champagne', 1.0, 'Le champagne est plus fin, le prosecco plus fruité'],
    ['Prosecco', 'Cava', 1.0, 'Le cava est l\'équivalent espagnol'],
    ['Jus de cranberry', 'Jus de grenade', 1.0, 'Saveur acidulée similaire'],
    ['Lait de coco', 'Crème de coco', 0.5, 'La crème est plus concentrée'],
    ['Vermouth rouge', 'Vermouth dry', 1.0, 'Change le profil du cocktail (sec vs doux)'],
    ['Sucre en poudre', 'Sirop de sucre', 2.0, '1 cuillère de sucre ≈ 2cl de sirop'],
  ];

  let created = 0;
  for (const [ingredientName, substituteName, ratio, notes] of substitutions) {
    const ingredient = await prisma.ingredient.findFirst({ where: { name: { equals: ingredientName, mode: 'insensitive' } } });
    const substitute = await prisma.ingredient.findFirst({ where: { name: { equals: substituteName, mode: 'insensitive' } } });

    if (ingredient && substitute) {
      try {
        await prisma.ingredientSubstitution.upsert({
          where: { ingredientId_substituteId: { ingredientId: ingredient.id, substituteId: substitute.id } },
          update: { ratio, notes },
          create: { ingredientId: ingredient.id, substituteId: substitute.id, ratio, notes },
        });
        created++;
        console.log(`  ✓ ${ingredientName} ↔ ${substituteName}`);
      } catch (err) {
        console.log(`  ✗ ${ingredientName} ↔ ${substituteName}: ${err.message}`);
      }
    } else {
      const missing = !ingredient ? ingredientName : substituteName;
      console.log(`  - Ignoré: ${missing} non trouvé en BDD`);
    }
  }

  console.log(`\n${created} substitutions créées/mises à jour`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
