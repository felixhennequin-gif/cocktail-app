// Seed du glossaire — termes courants de la mixologie
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const entries = [
  // Techniques
  { term: 'Shaker', category: 'technique', definition: 'Récipient utilisé pour mélanger les ingrédients d\'un cocktail en les secouant vigoureusement avec de la glace.' },
  { term: 'Muddler', category: 'technique', definition: 'Pilon de bar utilisé pour écraser des fruits, herbes ou épices au fond d\'un verre afin d\'en libérer les arômes.' },
  { term: 'Jigger', category: 'technique', definition: 'Doseur à double extrémité utilisé pour mesurer précisément les quantités d\'alcool et de sirop.' },
  { term: 'Build', category: 'technique', definition: 'Technique consistant à verser les ingrédients directement dans le verre de service, sans shaker.' },
  { term: 'Stir', category: 'technique', definition: 'Mélanger les ingrédients à la cuillère dans un verre à mélange avec de la glace, pour les cocktails transparents.' },
  { term: 'Shake', category: 'technique', definition: 'Secouer vigoureusement le shaker pendant 10-15 secondes pour refroidir et diluer le cocktail.' },
  { term: 'Strain', category: 'technique', definition: 'Filtrer le cocktail pour retirer la glace et les résidus solides lors du versement.' },
  { term: 'Double strain', category: 'technique', definition: 'Filtrer le cocktail à travers une passoire fine en plus du strainer du shaker, pour un liquide parfaitement lisse.' },
  { term: 'Dry shake', category: 'technique', definition: 'Secouer le shaker sans glace d\'abord (pour émulsionner le blanc d\'œuf), puis ajouter la glace et secouer à nouveau.' },
  { term: 'Flamber', category: 'technique', definition: 'Enflammer brièvement un ingrédient (zeste, alcool) pour créer des arômes de caramélisation.' },
  { term: 'Layer', category: 'technique', definition: 'Superposer délicatement les liquides par ordre de densité pour créer un effet visuel en couches.' },
  // Verres
  { term: 'Tumbler', category: 'glass', definition: 'Verre court et large, aussi appelé Old Fashioned glass. Idéal pour les cocktails servis sur glace.' },
  { term: 'Highball', category: 'glass', definition: 'Verre haut et étroit, utilisé pour les cocktails longs (mojito, gin tonic, collins).' },
  { term: 'Coupette', category: 'glass', definition: 'Verre évasé en forme de soucoupe, utilisé pour les cocktails servis sans glace (daiquiri, sidecar).' },
  { term: 'Martini glass', category: 'glass', definition: 'Verre en forme de V inversé à pied long, emblématique du Martini et du Cosmopolitan.' },
  { term: 'Flûte', category: 'glass', definition: 'Verre étroit et allongé, idéal pour les cocktails au champagne (Kir Royal, French 75).' },
  { term: 'Tiki mug', category: 'glass', definition: 'Tasse en céramique sculptée aux motifs polynésiens, utilisée pour les cocktails tiki.' },
  { term: 'Nick and Nora', category: 'glass', definition: 'Verre élégant à pied, plus petit qu\'une coupette, populaire pour les cocktails classiques.' },
  // Ingrédients
  { term: 'Bitters', category: 'ingredient', definition: 'Extraits aromatiques concentrés à base de plantes, écorces et épices, utilisés en petites quantités pour assaisonner un cocktail.' },
  { term: 'Simple syrup', category: 'ingredient', definition: 'Sirop de sucre obtenu en dissolvant du sucre dans de l\'eau à parts égales (1:1). Base sucrée de nombreux cocktails.' },
  { term: 'Orgeat', category: 'ingredient', definition: 'Sirop d\'amande aromatisé à la fleur d\'oranger, ingrédient clé du Mai Tai et de nombreux cocktails tiki.' },
  { term: 'Falernum', category: 'ingredient', definition: 'Sirop ou liqueur des Caraïbes à base de gingembre, amande, clou de girofle et citron vert.' },
  { term: 'Grenadine', category: 'ingredient', definition: 'Sirop de grenade (à l\'origine) utilisé pour sucrer et colorer les cocktails. Version artisanale vs industrielle.' },
  { term: 'Vermouth', category: 'ingredient', definition: 'Vin aromatisé aux plantes et épices. Le dry (blanc) est sec, le sweet (rouge) est plus sucré et amer.' },
  // Styles
  { term: 'Sour', category: 'style', definition: 'Famille de cocktails basée sur le trio alcool + agrume + sucre (ex: Whiskey Sour, Daiquiri, Margarita).' },
  { term: 'Fizz', category: 'style', definition: 'Cocktail de type sour complété par de l\'eau gazeuse (ex: Gin Fizz, Ramos Gin Fizz).' },
  { term: 'Collins', category: 'style', definition: 'Variante du fizz servie dans un grand verre avec beaucoup de glace (ex: Tom Collins, John Collins).' },
  { term: 'Tiki', category: 'style', definition: 'Style de cocktails tropicaux aux saveurs complexes, souvent à base de rhum, jus de fruits et sirops exotiques.' },
  { term: 'Highball', category: 'style', definition: 'Cocktail simple composé d\'un spiritueux et d\'un mixer servi dans un grand verre (ex: Gin Tonic, Cuba Libre).' },
  { term: 'Negroni', category: 'style', definition: 'Cocktail italien classique à parts égales de gin, Campari et vermouth rouge. Base de nombreuses variations.' },
  // Histoire
  { term: 'Prohibition', category: 'history', definition: 'Période d\'interdiction de l\'alcool aux États-Unis (1920-1933) qui a paradoxalement stimulé la créativité des barmen.' },
  { term: 'Speakeasy', category: 'history', definition: 'Bar clandestin pendant la Prohibition. Aujourd\'hui, désigne les bars cachés à l\'entrée discrète.' },
  { term: 'Jerry Thomas', category: 'history', definition: 'Considéré comme le père de la mixologie américaine, auteur du premier livre de recettes de cocktails (1862).' },
  { term: 'Tiki culture', category: 'history', definition: 'Mouvement culturel américain des années 1930-60 inspiré de la Polynésie, marqué par des cocktails exotiques et un décor tropical.' },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  let created = 0;
  for (const entry of entries) {
    const slug = entry.term.toLowerCase().replace(/[^a-z0-9àâäéèêëïîôùûüÿçœæ]+/g, '-').replace(/(^-|-$)/g, '');
    try {
      await prisma.glossaryEntry.upsert({
        where: { slug },
        update: { definition: entry.definition, category: entry.category },
        create: {
          term: entry.term,
          slug,
          definition: entry.definition,
          category: entry.category,
          relatedRecipeIds: [],
          relatedEntryIds: [],
        },
      });
      created++;
      console.log(`  ✓ ${entry.term}`);
    } catch (err) {
      console.log(`  ✗ ${entry.term}: ${err.message}`);
    }
  }

  console.log(`\n${created} entrées de glossaire créées/mises à jour`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
