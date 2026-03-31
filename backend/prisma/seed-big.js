require('dotenv').config();
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// --- Helpers ---

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Récupère les fichiers dans uploads/, retourne les URLs relatives ou []
const getUploadImages = () => {
  const dir = path.join(__dirname, '..', 'uploads');
  try {
    return fs.readdirSync(dir)
      .filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f))
      .map((f) => `/uploads/${f}`);
  } catch {
    return [];
  }
};

// --- Données ---

const ADJECTIVES = [
  'barman', 'mixo', 'cocktail', 'shaker', 'bartender', 'spirit', 'gin',
  'rum', 'vodka', 'whisky', 'vermouth', 'bitter', 'citrus', 'fizzy', 'tonic',
  'sour', 'sweet', 'dry', 'smoky', 'floral',
];

const BIOS = [
  'Passionné de cocktails depuis toujours.',
  'Amateur de spiritueux et de bonnes soirées.',
  'Je mixe, donc je suis.',
  'Toujours à la recherche du cocktail parfait.',
  'Barman amateur, goûts de pro.',
  'Fan de classics et de créations originales.',
  'Le shaker ne me quitte jamais.',
  null, null, null, // certains users sans bio
];

const CATEGORIES = [
  'Classiques', 'Tropicaux', 'Sours', 'Fizzes', 'Shooters',
  'Sans alcool', 'Digestifs', 'Apéritifs',
];

const RECIPES = [
  {
    name: 'Mojito Classique',
    description: 'Le cocktail cubain par excellence, frais et mentholé.',
    difficulty: 'EASY',
    prepTime: 5,
    category: 'Classiques',
    ingredients: [
      { name: 'Rhum blanc', quantity: 5, unit: 'cl' },
      { name: 'Jus de citron vert', quantity: 3, unit: 'cl' },
      { name: 'Sucre de canne', quantity: 2, unit: 'cl' },
      { name: 'Feuilles de menthe', quantity: 10, unit: 'feuilles' },
      { name: 'Eau gazeuse', quantity: 10, unit: 'cl' },
    ],
    steps: [
      'Écraser la menthe avec le sucre de canne dans un verre.',
      'Ajouter le jus de citron vert et le rhum.',
      'Remplir de glace pilée et compléter avec l\'eau gazeuse.',
      'Mélanger délicatement et garnir d\'une tranche de citron vert.',
    ],
  },
  {
    name: 'Margarita',
    description: 'Un incontournable mexicain à base de tequila.',
    difficulty: 'EASY',
    prepTime: 5,
    category: 'Classiques',
    ingredients: [
      { name: 'Tequila', quantity: 5, unit: 'cl' },
      { name: 'Triple sec', quantity: 2, unit: 'cl' },
      { name: 'Jus de citron vert', quantity: 3, unit: 'cl' },
      { name: 'Sel', quantity: 1, unit: 'pincée' },
    ],
    steps: [
      'Frotter le bord du verre avec un quartier de citron vert et tremper dans le sel.',
      'Shaker tous les ingrédients avec de la glace.',
      'Filtrer dans le verre givré.',
    ],
  },
  {
    name: 'Daiquiri Fraise',
    description: 'Version fruitée du daiquiri classique, parfaite en été.',
    difficulty: 'EASY',
    prepTime: 7,
    category: 'Classiques',
    ingredients: [
      { name: 'Rhum blanc', quantity: 5, unit: 'cl' },
      { name: 'Jus de citron vert', quantity: 3, unit: 'cl' },
      { name: 'Sirop de fraise', quantity: 2, unit: 'cl' },
      { name: 'Fraises fraîches', quantity: 4, unit: 'pièces' },
    ],
    steps: [
      'Mixer les fraises avec le sirop de fraise.',
      'Ajouter le rhum, le jus de citron vert et la glace.',
      'Shaker vigoureusement et filtrer.',
      'Servir dans une coupe froide garnie d\'une fraise.',
    ],
  },
  {
    name: 'Piña Colada',
    description: 'Cocktail tropical crémeux au rhum et à l\'ananas.',
    difficulty: 'EASY',
    prepTime: 5,
    category: 'Tropicaux',
    ingredients: [
      { name: 'Rhum blanc', quantity: 5, unit: 'cl' },
      { name: 'Lait de coco', quantity: 5, unit: 'cl' },
      { name: 'Jus d\'ananas', quantity: 10, unit: 'cl' },
    ],
    steps: [
      'Mixer tous les ingrédients avec beaucoup de glace.',
      'Servir dans un grand verre décoré d\'une tranche d\'ananas.',
    ],
  },
  {
    name: 'Cosmopolitan',
    description: 'Le cocktail rose de Sex & the City, acidulé et élégant.',
    difficulty: 'MEDIUM',
    prepTime: 5,
    category: 'Classiques',
    ingredients: [
      { name: 'Vodka citron', quantity: 4, unit: 'cl' },
      { name: 'Triple sec', quantity: 2, unit: 'cl' },
      { name: 'Jus de cranberry', quantity: 3, unit: 'cl' },
      { name: 'Jus de citron vert', quantity: 1, unit: 'cl' },
    ],
    steps: [
      'Shaker tous les ingrédients avec de la glace.',
      'Filtrer dans une coupe à martini refroidie.',
      'Garnir d\'un zeste de citron vert.',
    ],
  },
  {
    name: 'Negroni',
    description: 'Cocktail amer et sophistiqué, un classique italien.',
    difficulty: 'EASY',
    prepTime: 3,
    category: 'Apéritifs',
    ingredients: [
      { name: 'Gin', quantity: 3, unit: 'cl' },
      { name: 'Campari', quantity: 3, unit: 'cl' },
      { name: 'Vermouth rouge', quantity: 3, unit: 'cl' },
    ],
    steps: [
      'Mélanger les ingrédients dans un verre à mélange avec de la glace.',
      'Remuer jusqu\'à refroidissement.',
      'Filtrer sur un gros glaçon et garnir d\'un zeste d\'orange.',
    ],
  },
  {
    name: 'Whisky Sour',
    description: 'L\'équilibre parfait entre l\'acidité et la douceur du whisky.',
    difficulty: 'MEDIUM',
    prepTime: 5,
    category: 'Sours',
    ingredients: [
      { name: 'Whisky bourbon', quantity: 5, unit: 'cl' },
      { name: 'Jus de citron', quantity: 3, unit: 'cl' },
      { name: 'Sirop de sucre', quantity: 2, unit: 'cl' },
      { name: 'Blanc d\'oeuf', quantity: 1, unit: 'pièce' },
    ],
    steps: [
      'Dry shake tous les ingrédients sans glace pour émulsionner le blanc d\'oeuf.',
      'Ajouter la glace et shaker à nouveau.',
      'Filtrer dans un verre à rocks sur glace.',
      'Garnir d\'une cerise amarena et d\'un zeste de citron.',
    ],
  },
  {
    name: 'Aperol Spritz',
    description: 'Le cocktail de l\'été, léger et pétillant.',
    difficulty: 'EASY',
    prepTime: 3,
    category: 'Apéritifs',
    ingredients: [
      { name: 'Aperol', quantity: 6, unit: 'cl' },
      { name: 'Prosecco', quantity: 9, unit: 'cl' },
      { name: 'Eau gazeuse', quantity: 3, unit: 'cl' },
    ],
    steps: [
      'Remplir un verre à vin de glace.',
      'Verser le prosecco puis l\'Aperol.',
      'Compléter avec l\'eau gazeuse.',
      'Garnir d\'une tranche d\'orange.',
    ],
  },
  {
    name: 'Moscow Mule',
    description: 'Rafraîchissant et épicé, servi dans son célèbre mug en cuivre.',
    difficulty: 'EASY',
    prepTime: 4,
    category: 'Fizzes',
    ingredients: [
      { name: 'Vodka', quantity: 5, unit: 'cl' },
      { name: 'Ginger beer', quantity: 15, unit: 'cl' },
      { name: 'Jus de citron vert', quantity: 2, unit: 'cl' },
    ],
    steps: [
      'Remplir un mug en cuivre de glace.',
      'Ajouter la vodka et le jus de citron vert.',
      'Compléter avec la ginger beer.',
      'Garnir d\'une tranche de citron vert et de feuilles de menthe.',
    ],
  },
  {
    name: 'Old Fashioned',
    description: 'Le cocktail le plus vieux du monde, simple et puissant.',
    difficulty: 'MEDIUM',
    prepTime: 5,
    category: 'Classiques',
    ingredients: [
      { name: 'Whisky bourbon', quantity: 6, unit: 'cl' },
      { name: 'Sucre', quantity: 1, unit: 'morceau' },
      { name: 'Angostura bitters', quantity: 2, unit: 'traits' },
    ],
    steps: [
      'Écraser le sucre avec les bitters dans un verre.',
      'Ajouter le whisky et un gros glaçon.',
      'Remuer lentement jusqu\'à refroidissement.',
      'Garnir d\'un zeste d\'orange et d\'une cerise.',
    ],
  },
  {
    name: 'Gin Tonic',
    description: 'Simple, élégant, indétrônable.',
    difficulty: 'EASY',
    prepTime: 2,
    category: 'Apéritifs',
    ingredients: [
      { name: 'Gin', quantity: 5, unit: 'cl' },
      { name: 'Tonic water', quantity: 15, unit: 'cl' },
    ],
    steps: [
      'Remplir un verre ballon de glace.',
      'Verser le gin puis le tonic.',
      'Garnir selon le profil du gin : concombre, citron vert, baies de genièvre.',
    ],
  },
  {
    name: 'Caipirinha',
    description: 'Le cocktail national brésilien, sucré et acidulé.',
    difficulty: 'EASY',
    prepTime: 5,
    category: 'Classiques',
    ingredients: [
      { name: 'Cachaça', quantity: 6, unit: 'cl' },
      { name: 'Citron vert', quantity: 1, unit: 'pièce' },
      { name: 'Sucre de canne', quantity: 2, unit: 'cl' },
    ],
    steps: [
      'Couper le citron vert en 8 morceaux et écraser dans un verre avec le sucre.',
      'Remplir de glace pilée.',
      'Ajouter la cachaça et mélanger.',
    ],
  },
  {
    name: 'Pornstar Martini',
    description: 'Cocktail fruité et glamour à la vanille et au fruit de la passion.',
    difficulty: 'MEDIUM',
    prepTime: 6,
    category: 'Classiques',
    ingredients: [
      { name: 'Vodka vanille', quantity: 4, unit: 'cl' },
      { name: 'Liqueur de fruit de la passion', quantity: 2, unit: 'cl' },
      { name: 'Jus de fruit de la passion', quantity: 4, unit: 'cl' },
      { name: 'Jus de citron', quantity: 1, unit: 'cl' },
      { name: 'Prosecco', quantity: 5, unit: 'cl' },
    ],
    steps: [
      'Shaker la vodka, la liqueur, le jus de passion et le citron avec de la glace.',
      'Filtrer dans une coupe à martini.',
      'Déposer une demi-passion sur le dessus.',
      'Servir avec le verre de prosecco à côté.',
    ],
  },
  {
    name: 'Amaretto Sour',
    description: 'Doux, acidulé et légèrement amer, un dessert à boire.',
    difficulty: 'EASY',
    prepTime: 5,
    category: 'Sours',
    ingredients: [
      { name: 'Amaretto', quantity: 5, unit: 'cl' },
      { name: 'Jus de citron', quantity: 3, unit: 'cl' },
      { name: 'Blanc d\'oeuf', quantity: 1, unit: 'pièce' },
      { name: 'Sirop de sucre', quantity: 1, unit: 'cl' },
    ],
    steps: [
      'Dry shake tous les ingrédients.',
      'Ajouter de la glace et reshaker.',
      'Filtrer dans un verre à rocks sur glace.',
      'Garnir d\'une cerise et d\'un zeste d\'orange.',
    ],
  },
  {
    name: 'Dark & Stormy',
    description: 'Rhum brun et ginger beer, une combinaison explosive.',
    difficulty: 'EASY',
    prepTime: 3,
    category: 'Classiques',
    ingredients: [
      { name: 'Rhum brun', quantity: 6, unit: 'cl' },
      { name: 'Ginger beer', quantity: 15, unit: 'cl' },
      { name: 'Jus de citron vert', quantity: 1, unit: 'cl' },
    ],
    steps: [
      'Remplir un verre de glace.',
      'Verser la ginger beer et le jus de citron.',
      'Faire flotter le rhum brun sur le dessus.',
      'Garnir d\'une tranche de citron vert.',
    ],
  },
  {
    name: 'Tom Collins',
    description: 'Cocktail gin pétillant, long et rafraîchissant.',
    difficulty: 'EASY',
    prepTime: 4,
    category: 'Fizzes',
    ingredients: [
      { name: 'Gin', quantity: 5, unit: 'cl' },
      { name: 'Jus de citron', quantity: 3, unit: 'cl' },
      { name: 'Sirop de sucre', quantity: 2, unit: 'cl' },
      { name: 'Eau gazeuse', quantity: 10, unit: 'cl' },
    ],
    steps: [
      'Shaker le gin, le jus de citron et le sirop avec de la glace.',
      'Filtrer dans un grand verre sur glace.',
      'Compléter avec l\'eau gazeuse.',
      'Garnir d\'un quartier de citron et d\'une cerise.',
    ],
  },
  {
    name: 'Paloma',
    description: 'Le cocktail tequila-pamplemousse, incontournable au Mexique.',
    difficulty: 'EASY',
    prepTime: 4,
    category: 'Classiques',
    ingredients: [
      { name: 'Tequila', quantity: 5, unit: 'cl' },
      { name: 'Jus de pamplemousse', quantity: 10, unit: 'cl' },
      { name: 'Jus de citron vert', quantity: 1, unit: 'cl' },
      { name: 'Sel', quantity: 1, unit: 'pincée' },
      { name: 'Eau gazeuse', quantity: 5, unit: 'cl' },
    ],
    steps: [
      'Givrer le bord du verre avec du sel.',
      'Remplir de glace et ajouter la tequila.',
      'Verser le jus de pamplemousse et le citron vert.',
      'Compléter avec l\'eau gazeuse et mélanger doucement.',
    ],
  },
  {
    name: 'Sangria Blanche',
    description: 'Version estivale et légère de la sangria traditionnelle.',
    difficulty: 'EASY',
    prepTime: 15,
    category: 'Apéritifs',
    ingredients: [
      { name: 'Vin blanc sec', quantity: 75, unit: 'cl' },
      { name: 'Pêche', quantity: 2, unit: 'pièces' },
      { name: 'Citron vert', quantity: 1, unit: 'pièce' },
      { name: 'Sirop de pêche', quantity: 5, unit: 'cl' },
      { name: 'Eau gazeuse', quantity: 25, unit: 'cl' },
    ],
    steps: [
      'Couper les fruits en tranches dans un pichet.',
      'Ajouter le vin blanc et le sirop.',
      'Réserver au frais 1h minimum.',
      'Ajouter l\'eau gazeuse au moment de servir.',
    ],
  },
  {
    name: 'Tequila Sunrise',
    description: 'Aussi beau à regarder qu\'à boire.',
    difficulty: 'EASY',
    prepTime: 3,
    category: 'Tropicaux',
    ingredients: [
      { name: 'Tequila', quantity: 5, unit: 'cl' },
      { name: 'Jus d\'orange', quantity: 10, unit: 'cl' },
      { name: 'Sirop de grenadine', quantity: 2, unit: 'cl' },
    ],
    steps: [
      'Remplir un grand verre de glace.',
      'Verser la tequila puis le jus d\'orange.',
      'Faire glisser la grenadine le long du verre (elle coule au fond).',
      'Ne pas mélanger pour conserver l\'effet dégradé.',
    ],
  },
  {
    name: 'Sex on the Beach',
    description: 'Cocktail fruité et coloré pour les soirées d\'été.',
    difficulty: 'EASY',
    prepTime: 4,
    category: 'Tropicaux',
    ingredients: [
      { name: 'Vodka', quantity: 4, unit: 'cl' },
      { name: 'Liqueur de pêche', quantity: 2, unit: 'cl' },
      { name: 'Jus d\'orange', quantity: 6, unit: 'cl' },
      { name: 'Jus de cranberry', quantity: 4, unit: 'cl' },
    ],
    steps: [
      'Remplir un grand verre de glace.',
      'Verser la vodka et la liqueur de pêche.',
      'Ajouter le jus d\'orange et le cranberry.',
      'Remuer et garnir d\'une tranche d\'orange.',
    ],
  },
  {
    name: 'Espresso Martini',
    description: 'Pour les nuits où l\'on veut veiller tard.',
    difficulty: 'MEDIUM',
    prepTime: 5,
    category: 'Classiques',
    ingredients: [
      { name: 'Vodka', quantity: 5, unit: 'cl' },
      { name: 'Liqueur de café', quantity: 2, unit: 'cl' },
      { name: 'Espresso', quantity: 3, unit: 'cl' },
      { name: 'Sirop de sucre', quantity: 1, unit: 'cl' },
    ],
    steps: [
      'Préparer un espresso et laisser refroidir légèrement.',
      'Shaker tous les ingrédients vigoureusement avec beaucoup de glace.',
      'Filtrer dans une coupe à martini.',
      'Garnir de 3 grains de café.',
    ],
  },
  {
    name: 'Clover Club',
    description: 'Cocktail gin-framboise soyeux grâce au blanc d\'oeuf.',
    difficulty: 'MEDIUM',
    prepTime: 6,
    category: 'Classiques',
    ingredients: [
      { name: 'Gin', quantity: 5, unit: 'cl' },
      { name: 'Sirop de framboise', quantity: 2, unit: 'cl' },
      { name: 'Jus de citron', quantity: 2, unit: 'cl' },
      { name: 'Blanc d\'oeuf', quantity: 1, unit: 'pièce' },
    ],
    steps: [
      'Dry shake sans glace pour monter le blanc d\'oeuf.',
      'Ajouter glace et reshaker.',
      'Filtrer dans une coupe refroidie.',
    ],
  },
  {
    name: 'Harvey Wallbanger',
    description: 'Vodka, jus d\'orange et Galliano — un classique des 70s.',
    difficulty: 'EASY',
    prepTime: 3,
    category: 'Classiques',
    ingredients: [
      { name: 'Vodka', quantity: 4, unit: 'cl' },
      { name: 'Jus d\'orange', quantity: 10, unit: 'cl' },
      { name: 'Galliano', quantity: 2, unit: 'cl' },
    ],
    steps: [
      'Remplir un grand verre de glace.',
      'Ajouter la vodka et le jus d\'orange.',
      'Faire flotter le Galliano sur le dessus.',
      'Garnir d\'une tranche d\'orange.',
    ],
  },
  {
    name: 'Blue Lagoon',
    description: 'Cocktail bleu électrique à la vodka et au curaçao.',
    difficulty: 'EASY',
    prepTime: 4,
    category: 'Tropicaux',
    ingredients: [
      { name: 'Vodka', quantity: 4, unit: 'cl' },
      { name: 'Curaçao bleu', quantity: 2, unit: 'cl' },
      { name: 'Limonade', quantity: 15, unit: 'cl' },
    ],
    steps: [
      'Remplir un grand verre de glace.',
      'Verser la vodka et le curaçao bleu.',
      'Compléter avec la limonade.',
      'Garnir d\'un quartier de citron.',
    ],
  },
  {
    name: 'French 75',
    description: 'Champagne et gin, l\'alliance festive par excellence.',
    difficulty: 'MEDIUM',
    prepTime: 5,
    category: 'Fizzes',
    ingredients: [
      { name: 'Gin', quantity: 3, unit: 'cl' },
      { name: 'Jus de citron', quantity: 2, unit: 'cl' },
      { name: 'Sirop de sucre', quantity: 1, unit: 'cl' },
      { name: 'Champagne', quantity: 10, unit: 'cl' },
    ],
    steps: [
      'Shaker le gin, le citron et le sirop avec de la glace.',
      'Filtrer dans une flûte.',
      'Compléter avec le champagne.',
      'Garnir d\'un zeste de citron.',
    ],
  },
  {
    name: 'Jungle Bird',
    description: 'Cocktail malaisien puissant au rhum et à l\'Aperol.',
    difficulty: 'MEDIUM',
    prepTime: 5,
    category: 'Tropicaux',
    ingredients: [
      { name: 'Rhum brun', quantity: 4, unit: 'cl' },
      { name: 'Campari', quantity: 2, unit: 'cl' },
      { name: 'Jus d\'ananas', quantity: 4, unit: 'cl' },
      { name: 'Jus de citron vert', quantity: 2, unit: 'cl' },
      { name: 'Sirop de sucre', quantity: 1, unit: 'cl' },
    ],
    steps: [
      'Shaker tous les ingrédients avec de la glace.',
      'Filtrer dans un verre décoré de feuilles de palmier.',
    ],
  },
  {
    name: 'Paper Plane',
    description: 'Quatre ingrédients à parts égales, résultat parfait.',
    difficulty: 'MEDIUM',
    prepTime: 4,
    category: 'Classiques',
    ingredients: [
      { name: 'Bourbon', quantity: 3, unit: 'cl' },
      { name: 'Aperol', quantity: 3, unit: 'cl' },
      { name: 'Amaro Nonino', quantity: 3, unit: 'cl' },
      { name: 'Jus de citron', quantity: 3, unit: 'cl' },
    ],
    steps: [
      'Shaker tous les ingrédients à parts égales avec beaucoup de glace.',
      'Filtrer dans une coupe refroidie.',
    ],
  },
  {
    name: 'Bamboo',
    description: 'Cocktail bas en alcool, élégant et sec à base de xérès.',
    difficulty: 'EASY',
    prepTime: 4,
    category: 'Apéritifs',
    ingredients: [
      { name: 'Amontillado sherry', quantity: 4, unit: 'cl' },
      { name: 'Vermouth sec', quantity: 4, unit: 'cl' },
      { name: 'Angostura bitters', quantity: 1, unit: 'trait' },
      { name: 'Orange bitters', quantity: 1, unit: 'trait' },
    ],
    steps: [
      'Mélanger au verre avec de la glace pendant 30 secondes.',
      'Filtrer dans une coupe refroidie.',
      'Exprimer un zeste de citron sur la surface.',
    ],
  },
  {
    name: 'Gimlet',
    description: 'Gin et citron vert, net, acide, irrésistible.',
    difficulty: 'EASY',
    prepTime: 4,
    category: 'Classiques',
    ingredients: [
      { name: 'Gin', quantity: 6, unit: 'cl' },
      { name: 'Cordial de citron vert', quantity: 2, unit: 'cl' },
    ],
    steps: [
      'Shaker avec beaucoup de glace.',
      'Filtrer dans une coupe refroidie.',
      'Garnir d\'un zeste de citron vert.',
    ],
  },
  {
    name: 'Sidecar',
    description: 'Cognac, triple sec et citron — l\'élégance française.',
    difficulty: 'MEDIUM',
    prepTime: 5,
    category: 'Classiques',
    ingredients: [
      { name: 'Cognac', quantity: 5, unit: 'cl' },
      { name: 'Triple sec', quantity: 2, unit: 'cl' },
      { name: 'Jus de citron', quantity: 2, unit: 'cl' },
    ],
    steps: [
      'Givrer le bord du verre avec du sucre.',
      'Shaker tous les ingrédients avec de la glace.',
      'Filtrer dans la coupe.',
    ],
  },
  {
    name: 'Bramble',
    description: 'Gin et mûres, un sour moderne très populaire.',
    difficulty: 'MEDIUM',
    prepTime: 5,
    category: 'Sours',
    ingredients: [
      { name: 'Gin', quantity: 5, unit: 'cl' },
      { name: 'Jus de citron', quantity: 3, unit: 'cl' },
      { name: 'Sirop de sucre', quantity: 1.5, unit: 'cl' },
      { name: 'Liqueur de mûre', quantity: 2, unit: 'cl' },
    ],
    steps: [
      'Shaker le gin, le citron et le sirop avec de la glace.',
      'Filtrer sur glace pilée dans un verre à rocks.',
      'Faire couler la liqueur de mûre sur le dessus en zigzag.',
      'Garnir de mûres fraîches.',
    ],
  },
  {
    name: 'Penicillin',
    description: 'Whisky écossais, miel, citron et gingembre — un moderne classique.',
    difficulty: 'HARD',
    prepTime: 8,
    category: 'Sours',
    ingredients: [
      { name: 'Scotch blended', quantity: 5, unit: 'cl' },
      { name: 'Jus de citron', quantity: 3, unit: 'cl' },
      { name: 'Sirop miel-gingembre', quantity: 2, unit: 'cl' },
      { name: 'Scotch tourbé', quantity: 1, unit: 'cl' },
    ],
    steps: [
      'Préparer le sirop miel-gingembre en chauffant miel et gingembre râpé.',
      'Shaker le scotch blended, le citron et le sirop avec de la glace.',
      'Filtrer sur glace dans un verre à rocks.',
      'Faire flotter le scotch tourbé et garnir de gingembre confit.',
    ],
  },
  {
    name: 'Last Word',
    description: 'Quatre ingrédients à parts égales, équilibre parfait.',
    difficulty: 'MEDIUM',
    prepTime: 4,
    category: 'Classiques',
    ingredients: [
      { name: 'Gin', quantity: 2.5, unit: 'cl' },
      { name: 'Chartreuse verte', quantity: 2.5, unit: 'cl' },
      { name: 'Maraschino', quantity: 2.5, unit: 'cl' },
      { name: 'Jus de citron vert', quantity: 2.5, unit: 'cl' },
    ],
    steps: [
      'Shaker tous les ingrédients à parts égales avec de la glace.',
      'Filtrer dans une coupe refroidie.',
    ],
  },
  {
    name: 'Garibaldi',
    description: 'Campari et jus d\'orange fluffy — le plus simple des apéritifs.',
    difficulty: 'EASY',
    prepTime: 3,
    category: 'Apéritifs',
    ingredients: [
      { name: 'Campari', quantity: 5, unit: 'cl' },
      { name: 'Jus d\'orange frais', quantity: 15, unit: 'cl' },
    ],
    steps: [
      'Presser et centrifuger le jus d\'orange pour le rendre aéré.',
      'Verser le Campari sur glace.',
      'Ajouter délicatement le jus d\'orange.',
      'Garnir d\'une tranche d\'orange.',
    ],
  },
  {
    name: 'Mojito sans alcool',
    description: 'Toute la fraîcheur du mojito sans alcool.',
    difficulty: 'EASY',
    prepTime: 5,
    category: 'Sans alcool',
    ingredients: [
      { name: 'Jus de citron vert', quantity: 4, unit: 'cl' },
      { name: 'Sirop de canne', quantity: 3, unit: 'cl' },
      { name: 'Feuilles de menthe', quantity: 12, unit: 'feuilles' },
      { name: 'Eau gazeuse', quantity: 20, unit: 'cl' },
    ],
    steps: [
      'Écraser la menthe avec le sirop dans un verre.',
      'Ajouter le jus de citron vert et beaucoup de glace pilée.',
      'Compléter avec l\'eau gazeuse et mélanger.',
    ],
  },
  {
    name: 'Shirley Temple',
    description: 'Cocktail sans alcool classique des années 80.',
    difficulty: 'EASY',
    prepTime: 2,
    category: 'Sans alcool',
    ingredients: [
      { name: 'Ginger ale', quantity: 15, unit: 'cl' },
      { name: 'Sirop de grenadine', quantity: 3, unit: 'cl' },
      { name: 'Jus d\'orange', quantity: 5, unit: 'cl' },
    ],
    steps: [
      'Remplir un grand verre de glace.',
      'Verser le jus d\'orange et le ginger ale.',
      'Ajouter la grenadine sans mélanger pour l\'effet dégradé.',
      'Garnir d\'une cerise et d\'une tranche d\'orange.',
    ],
  },
  {
    name: 'Virgin Colada',
    description: 'Le goût tropical sans l\'alcool.',
    difficulty: 'EASY',
    prepTime: 5,
    category: 'Sans alcool',
    ingredients: [
      { name: 'Lait de coco', quantity: 8, unit: 'cl' },
      { name: 'Jus d\'ananas', quantity: 15, unit: 'cl' },
      { name: 'Sirop de canne', quantity: 2, unit: 'cl' },
    ],
    steps: [
      'Mixer tous les ingrédients avec beaucoup de glace.',
      'Servir dans un grand verre décoré d\'ananas.',
    ],
  },
  {
    name: 'Arnold Palmer',
    description: 'Moitié thé glacé, moitié limonade — rafraîchissant et simple.',
    difficulty: 'EASY',
    prepTime: 5,
    category: 'Sans alcool',
    ingredients: [
      { name: 'Thé glacé non sucré', quantity: 15, unit: 'cl' },
      { name: 'Limonade maison', quantity: 15, unit: 'cl' },
    ],
    steps: [
      'Préparer le thé glacé et la limonade séparément.',
      'Remplir un grand verre de glace.',
      'Verser les deux en même temps de chaque côté pour un effet bicolore.',
      'Garnir d\'une tranche de citron.',
    ],
  },
  {
    name: 'Kir Royal',
    description: 'Champagne et crème de cassis, l\'apéritif français élégant.',
    difficulty: 'EASY',
    prepTime: 2,
    category: 'Apéritifs',
    ingredients: [
      { name: 'Champagne brut', quantity: 15, unit: 'cl' },
      { name: 'Crème de cassis', quantity: 2, unit: 'cl' },
    ],
    steps: [
      'Verser la crème de cassis dans une flûte froide.',
      'Compléter délicatement avec le champagne.',
      'Ne pas mélanger — servir immédiatement.',
    ],
  },
  {
    name: 'Stinger',
    description: 'Cognac et crème de menthe, un digestif tout en contraste.',
    difficulty: 'EASY',
    prepTime: 3,
    category: 'Digestifs',
    ingredients: [
      { name: 'Cognac', quantity: 6, unit: 'cl' },
      { name: 'Crème de menthe blanche', quantity: 2, unit: 'cl' },
    ],
    steps: [
      'Shaker avec de la glace.',
      'Filtrer dans une coupe refroidie.',
    ],
  },
  {
    name: 'Grasshopper',
    description: 'Cocktail dessert vert à la crème de menthe et au cacao.',
    difficulty: 'EASY',
    prepTime: 4,
    category: 'Digestifs',
    ingredients: [
      { name: 'Crème de menthe verte', quantity: 3, unit: 'cl' },
      { name: 'Crème de cacao blanc', quantity: 3, unit: 'cl' },
      { name: 'Crème fraîche', quantity: 3, unit: 'cl' },
    ],
    steps: [
      'Shaker tous les ingrédients avec de la glace.',
      'Filtrer dans une coupe refroidie.',
      'Garnir d\'une feuille de menthe.',
    ],
  },
  {
    name: 'Pousse-café',
    description: 'Digestif en couches multicolores, un exercice de précision.',
    difficulty: 'HARD',
    prepTime: 10,
    category: 'Digestifs',
    ingredients: [
      { name: 'Grenadine', quantity: 2, unit: 'cl' },
      { name: 'Crème de menthe verte', quantity: 2, unit: 'cl' },
      { name: 'Triple sec', quantity: 2, unit: 'cl' },
      { name: 'Cognac', quantity: 2, unit: 'cl' },
    ],
    steps: [
      'Verser la grenadine dans un verre à shot.',
      'Faire couler délicatement la crème de menthe en la versant sur le dos d\'une cuillère.',
      'Ajouter le triple sec de la même façon.',
      'Finir avec le cognac — ne pas mélanger.',
    ],
  },
  {
    name: 'B-52',
    description: 'Trois liqueurs en couches, un shooter spectaculaire.',
    difficulty: 'MEDIUM',
    prepTime: 5,
    category: 'Shooters',
    ingredients: [
      { name: 'Liqueur de café', quantity: 2, unit: 'cl' },
      { name: 'Baileys', quantity: 2, unit: 'cl' },
      { name: 'Grand Marnier', quantity: 2, unit: 'cl' },
    ],
    steps: [
      'Verser la liqueur de café au fond du verre à shot.',
      'Faire flotter le Baileys dessus avec une cuillère.',
      'Finir avec le Grand Marnier de la même façon.',
      'On peut le flamber avant de boire.',
    ],
  },
  {
    name: 'Kamikaze',
    description: 'Shooter vodka-citron-triple sec, une bombe.',
    difficulty: 'EASY',
    prepTime: 3,
    category: 'Shooters',
    ingredients: [
      { name: 'Vodka', quantity: 3, unit: 'cl' },
      { name: 'Triple sec', quantity: 1.5, unit: 'cl' },
      { name: 'Jus de citron vert', quantity: 1.5, unit: 'cl' },
    ],
    steps: [
      'Shaker tous les ingrédients avec de la glace.',
      'Filtrer dans des verres à shot.',
    ],
  },
  {
    name: 'Lemon Drop',
    description: 'Shooter vodka-citron acidulé avec bord sucré.',
    difficulty: 'EASY',
    prepTime: 3,
    category: 'Shooters',
    ingredients: [
      { name: 'Vodka citron', quantity: 4, unit: 'cl' },
      { name: 'Triple sec', quantity: 1, unit: 'cl' },
      { name: 'Jus de citron', quantity: 2, unit: 'cl' },
      { name: 'Sucre', quantity: 1, unit: 'pincée' },
    ],
    steps: [
      'Givrer le bord des verres à shot avec du sucre.',
      'Shaker tous les ingrédients avec de la glace.',
      'Filtrer dans les verres sucrés.',
    ],
  },
  {
    name: 'Zombie',
    description: 'Cocktail tiki puissant aux rhums multiples, à consommer avec modération.',
    difficulty: 'HARD',
    prepTime: 8,
    category: 'Tropicaux',
    ingredients: [
      { name: 'Rhum blanc', quantity: 3, unit: 'cl' },
      { name: 'Rhum ambré', quantity: 3, unit: 'cl' },
      { name: 'Rhum brun', quantity: 3, unit: 'cl' },
      { name: 'Absinthe', quantity: 0.5, unit: 'cl' },
      { name: 'Jus de citron vert', quantity: 2, unit: 'cl' },
      { name: 'Jus de pamplemousse', quantity: 2, unit: 'cl' },
      { name: 'Sirop de cannelle', quantity: 1.5, unit: 'cl' },
    ],
    steps: [
      'Blender tous les ingrédients avec de la glace pilée.',
      'Verser dans un grand verre tiki.',
      'Garnir de menthe, de fruits et d\'une ombrelle.',
      'Maximum 2 par personne — sérieusement.',
    ],
  },
  {
    name: 'Spicy Margarita',
    description: 'La margarita classique avec un kick de piment.',
    difficulty: 'MEDIUM',
    prepTime: 7,
    category: 'Classiques',
    ingredients: [
      { name: 'Tequila', quantity: 5, unit: 'cl' },
      { name: 'Triple sec', quantity: 2, unit: 'cl' },
      { name: 'Jus de citron vert', quantity: 3, unit: 'cl' },
      { name: 'Piment jalapeño', quantity: 3, unit: 'rondelles' },
      { name: 'Sel', quantity: 1, unit: 'pincée' },
    ],
    steps: [
      'Écraser les rondelles de jalapeño dans le shaker.',
      'Ajouter les autres ingrédients et la glace.',
      'Shaker énergiquement et double filtrer.',
      'Servir dans un verre givré avec du sel et du piment.',
    ],
  },
  {
    name: 'Black Russian',
    description: 'Vodka et liqueur de café, simple et efficace.',
    difficulty: 'EASY',
    prepTime: 2,
    category: 'Classiques',
    ingredients: [
      { name: 'Vodka', quantity: 5, unit: 'cl' },
      { name: 'Liqueur de café', quantity: 2, unit: 'cl' },
    ],
    steps: [
      'Remplir un verre à rocks de glace.',
      'Verser la vodka puis la liqueur de café.',
      'Remuer brièvement.',
    ],
  },
  {
    name: 'White Russian',
    description: 'Le cocktail du Dude. Vodka, café et crème.',
    difficulty: 'EASY',
    prepTime: 3,
    category: 'Classiques',
    ingredients: [
      { name: 'Vodka', quantity: 5, unit: 'cl' },
      { name: 'Liqueur de café', quantity: 2, unit: 'cl' },
      { name: 'Crème fraîche', quantity: 3, unit: 'cl' },
    ],
    steps: [
      'Remplir un verre à rocks de glace.',
      'Verser la vodka et la liqueur de café.',
      'Faire couler délicatement la crème sur le dessus.',
    ],
  },
  {
    name: 'Singapore Sling',
    description: 'Cocktail tiki complexe né au Raffles Hotel, sucré et floral.',
    difficulty: 'HARD',
    prepTime: 8,
    category: 'Tropicaux',
    ingredients: [
      { name: 'Gin', quantity: 3, unit: 'cl' },
      { name: 'Cherry brandy', quantity: 1.5, unit: 'cl' },
      { name: 'Cointreau', quantity: 0.75, unit: 'cl' },
      { name: 'Bénédictine', quantity: 0.75, unit: 'cl' },
      { name: 'Jus d\'ananas', quantity: 12, unit: 'cl' },
      { name: 'Jus de citron vert', quantity: 1.5, unit: 'cl' },
      { name: 'Sirop de grenadine', quantity: 1, unit: 'cl' },
      { name: 'Angostura bitters', quantity: 1, unit: 'trait' },
    ],
    steps: [
      'Shaker tous les ingrédients avec de la glace.',
      'Filtrer dans un verre highball rempli de glace.',
      'Garnir d\'une cerise et d\'une tranche d\'ananas.',
      'Servir avec une paille.',
    ],
  },
];

// --- Main ---

async function main() {
  console.log('🌱 Démarrage du seed-big...');

  const passwordHash = await bcrypt.hash('password123', 10);
  const images = getUploadImages();
  console.log(`📸 ${images.length} image(s) trouvée(s) dans uploads/`);

  // 1. Créer les catégories
  console.log('📂 Création des catégories...');
  const categoryMap = {};
  for (const name of CATEGORIES) {
    const slug = name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
    const cat = await prisma.category.upsert({
      where: { name },
      create: { name, slug },
      update: {},
    });
    categoryMap[name] = cat.id;
  }

  // 2. Créer 100 users
  console.log('👤 Création de 100 utilisateurs...');
  const users = [];
  for (let i = 1; i <= 100; i++) {
    const adj = pick(ADJECTIVES);
    const pseudo = `${adj}_${i}`;
    const email = `${pseudo}@cocktailapp.test`;
    const bio = pick(BIOS);

    const user = await prisma.user.upsert({
      where: { pseudo },
      create: { pseudo, email, passwordHash, bio },
      update: { bio },
    });
    users.push(user);
  }
  console.log(`✅ ${users.length} utilisateurs créés`);

  // 3. Créer des follows aléatoires (0-8 par user)
  console.log('🔗 Création des relations follow...');
  let followCount = 0;
  for (const user of users) {
    const nbFollowers = Math.floor(Math.random() * 9); // 0 à 8
    const candidates = shuffle(users.filter((u) => u.id !== user.id));
    const chosen = candidates.slice(0, nbFollowers);

    for (const follower of chosen) {
      await prisma.follow.upsert({
        where: { followerId_followingId: { followerId: follower.id, followingId: user.id } },
        create: { followerId: follower.id, followingId: user.id },
        update: {},
      });
      followCount++;
    }
  }
  console.log(`✅ ${followCount} relations follow créées`);

  // 4. Créer 50 recettes (upsert sur le nom)
  console.log('🍹 Création de 50 recettes...');
  let recipeCount = 0;
  for (const data of RECIPES) {
    const authorId = pick(users).id;
    const categoryId = categoryMap[data.category];
    const imageUrl = images.length > 0 ? pick(images) : null;

    // findFirst + create/update (name n'est pas @unique dans le schéma)
    let recipe = await prisma.recipe.findFirst({ where: { name: data.name } });
    if (recipe) {
      recipe = await prisma.recipe.update({
        where: { id: recipe.id },
        data: {
          description: data.description,
          difficulty: data.difficulty,
          prepTime: data.prepTime,
          categoryId,
          authorId,
          imageUrl,
        },
      });
    } else {
      recipe = await prisma.recipe.create({
        data: {
          name: data.name,
          description: data.description,
          difficulty: data.difficulty,
          prepTime: data.prepTime,
          status: 'PUBLISHED',
          categoryId,
          authorId,
          imageUrl,
        },
      });
    }

    // Ingrédients (supprimer les anciens si mise à jour)
    await prisma.recipeIngredient.deleteMany({ where: { recipeId: recipe.id } });
    for (const ing of data.ingredients) {
      const ingredient = await prisma.ingredient.upsert({
        where: { name: ing.name },
        create: { name: ing.name },
        update: {},
      });
      await prisma.recipeIngredient.create({
        data: { recipeId: recipe.id, ingredientId: ingredient.id, quantity: ing.quantity, unit: ing.unit },
      });
    }

    // Steps (supprimer les anciens si mise à jour)
    await prisma.step.deleteMany({ where: { recipeId: recipe.id } });
    for (let i = 0; i < data.steps.length; i++) {
      await prisma.step.create({
        data: { recipeId: recipe.id, order: i + 1, description: data.steps[i] },
      });
    }

    recipeCount++;
  }
  console.log(`✅ ${recipeCount} recettes créées/mises à jour`);

  console.log('🎉 seed-big terminé !');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
