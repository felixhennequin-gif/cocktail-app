require('dotenv').config();
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const pg = require('pg');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Génère un slug à partir d'un nom (même logique que le controller).
 */
const generateSlug = (name) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

const techniques = [
  {
    name: 'Shaker',
    description:
      "Technique consistant à mélanger les ingrédients dans un shaker avec des glaçons, puis à secouer vigoureusement pendant environ 10 à 15 secondes. Cela refroidit et dilue le cocktail tout en créant une légère texture mousseuse. Utilisé pour les cocktails contenant des jus de fruits, des sirops ou des produits laitiers.",
  },
  {
    name: 'Mélanger (stir)',
    description:
      "Mélange délicat réalisé avec une cuillère à mélange dans un verre à mélange rempli de glaçons. On tourne la cuillère contre la paroi intérieure du verre pendant 20 à 30 secondes pour refroidir et diluer sans incorporer d'air. Technique privilégiée pour les cocktails tout-alcool comme le Martini ou le Manhattan.",
  },
  {
    name: 'Muddle (écraser)',
    description:
      "Action d'écraser doucement des fruits, des herbes aromatiques ou des épices au fond du verre ou du shaker à l'aide d'un pilon (muddler). L'objectif est d'extraire les huiles essentielles et les sucs sans déchirer les fibres végétales, ce qui évite l'amertume. Technique incontournable pour le Mojito ou le Caïpirinha.",
  },
  {
    name: 'Filtrer (strain)',
    description:
      "Opération qui consiste à verser le cocktail préparé dans le verre de service en retenant les glaçons et les solides grâce à une passoire Hawthorne ou une julep strainer. Le filtrage garantit une texture lisse et une présentation soignée.",
  },
  {
    name: 'Double filtration (double strain)',
    description:
      "Technique de filtration en deux étapes : on utilise d'abord la passoire du shaker, puis on passe le liquide à travers une fine passette à thé pour retenir les petits éclats de glace et les résidus végétaux. Donne un rendu très propre et cristallin, particulièrement apprécié dans les cocktails servis sans glace.",
  },
  {
    name: 'Build (construire dans le verre)',
    description:
      "Méthode de préparation directement dans le verre de service, en ajoutant les ingrédients les uns après les autres sur la glace. Un simple remuage suffit pour mélanger. Utilisé pour les boissons longues comme le Cuba Libre, le Gin Tonic ou le Spritz.",
  },
  {
    name: 'Layer / Float (couches)',
    description:
      "Technique permettant de créer des couches visuellement distinctes en versant les ingrédients très délicatement, en s'aidant d'une cuillère à mélange retournée pour ralentir le flux. Chaque liquide doit avoir une densité différente (mesurée par la teneur en sucre ou en alcool) pour ne pas se mélanger.",
  },
  {
    name: 'Garnir',
    description:
      "Étape finale de décoration du cocktail avec un élément comestible ou esthétique : zeste d'agrume, tranche de fruit, olive, cerise au marasquin, fleur, herbe fraîche, etc. La garniture peut aussi contribuer à l'arôme du cocktail lorsque le client la manipule en portant le verre à ses lèvres.",
  },
  {
    name: 'Exprimer un zeste',
    description:
      "Technique consistant à pincer un zeste d'agrume (citron, orange, pamplemousse) au-dessus du cocktail pour en libérer les huiles essentielles par pression. Les micro-gouttelettes d'huile se déposent à la surface du verre et du liquide, ajoutant une note aromatique et parfois légèrement grasse au nez du cocktail.",
  },
  {
    name: 'Givrer le verre (rim)',
    description:
      "Préparation du bord du verre en le passant d'abord sur un demi-citron ou un sirop, puis en le plongeant dans du sel, du sucre, de la poudre de piment ou toute autre garniture. Crée un contraste de saveur dès la première gorgée. Typique de la Margarita (sel) ou de certains shooters sucrés.",
  },
  {
    name: 'Dry shake',
    description:
      "Technique de shaker sans glace, généralement utilisée pour les cocktails contenant du blanc d'œuf ou de l'aquafaba. Le shaker est d'abord agité à sec pendant 10 à 15 secondes pour émulsifier la protéine et créer une mousse stable, avant d'être agité une seconde fois avec des glaçons pour refroidir.",
  },
  {
    name: 'Reverse dry shake',
    description:
      "Variante du dry shake dans laquelle on shake d'abord les ingrédients avec des glaçons pour refroidir, on filtre, puis on reshake sans glace. Cette méthode produit une mousse encore plus aérée et fine car la dilution est déjà réalisée, permettant d'émulsifier le blanc d'œuf sans eau supplémentaire.",
  },
  {
    name: 'Flamber',
    description:
      "Technique spectaculaire consistant à enflammer brièvement un zeste d'orange ou une liqueur alcoolisée au-dessus du cocktail. La chaleur caramélise les huiles essentielles du zeste ou brûle l'alcool de surface, apportant des notes fumées, grillées et légèrement amères. À pratiquer avec précaution.",
  },
  {
    name: 'Fumer',
    description:
      "Méthode consistant à introduire de la fumée dans le verre ou la carafe via un pistolet à fumée ou en brûlant des copeaux de bois aromatique. La fumée se dissout partiellement dans le cocktail, ajoutant une dimension aromatique boisée, fumée ou tourbée. Technique utilisée pour sublimer les spiritueux de caractère comme le whisky ou le mezcal.",
  },
  {
    name: 'Churner (swizzle)',
    description:
      "Technique de mélange réalisée directement dans le verre en insérant un swizzle stick (branche de bois naturellement fourchue) entre les paumes et en le faisant tourner rapidement de haut en bas. Le mouvement rotatif crée une agitation centrifuge qui refroidit et mélange le cocktail de manière homogène, tout en formant du givre à l'extérieur du verre.",
  },
  {
    name: 'Rouler (roll)',
    description:
      "Alternative douce au shaker : on verse le cocktail d'un recipient à l'autre à deux ou trois reprises pour le mélanger et l'aérer légèrement sans le secouer violemment. Technique utilisée pour le Bloody Mary afin d'éviter de trop diluer et de conserver la texture veloutée de la tomate.",
  },
  {
    name: 'Throwing (verser en hauteur)',
    description:
      "Technique d'origine espagnole consistant à verser le cocktail d'un grand récipient à un autre en laissant s'écouler le liquide depuis une hauteur d'environ 50 cm. L'aération ainsi créée adoucit le mélange, arrondit les arômes et donne une texture soyeuse. Spectaculaire et impressionnant derrière le bar.",
  },
  {
    name: 'Fat wash',
    description:
      "Technique d'infusion lipidique permettant de transférer les arômes solubles dans les graisses dans un alcool. On mélange un corps gras (beurre noisette, huile de noix de coco, bacon grillé, etc.) à l'alcool, on laisse infuser, puis on congèle pour solidifier la graisse avant de filtrer. L'alcool conserve les arômes sans le goût gras.",
  },
];

const main = async () => {
  console.log('Seed techniques — début');

  let created = 0;
  let skipped = 0;

  for (const t of techniques) {
    const slug = generateSlug(t.name);

    // Upsert : crée si inexistant, ignore si déjà présent
    const existing = await prisma.technique.findUnique({ where: { slug } });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.technique.create({
      data: {
        name:        t.name,
        slug,
        description: t.description,
        videoUrl:    t.videoUrl    ?? null,
        iconUrl:     t.iconUrl     ?? null,
      },
    });
    created++;
  }

  console.log(`Seed techniques — terminé (${created} créées, ${skipped} ignorées)`);
};

main()
  .catch((err) => {
    console.error('Erreur seed techniques :', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
