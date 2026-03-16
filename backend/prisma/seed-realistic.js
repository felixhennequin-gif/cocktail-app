require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// ──────────────────────────────────────────────
// Données utilisateurs
// ──────────────────────────────────────────────

const USERS_DATA = [
  {
    pseudo: 'barman_felix',
    email: 'felix@bar.fr',
    bio: "Barman professionnel depuis 10 ans. Je partage ici mes classiques incontournables.",
    avatar: null,
  },
  {
    pseudo: 'cocktail_addict',
    email: 'addict@cocktails.fr',
    bio: "Passionné de mixologie depuis que j'ai goûté mon premier Negroni. Toujours à la recherche du prochain favori.",
    avatar: null,
  },
  {
    pseudo: 'weekendmixer',
    email: 'weekendmixer@gmail.fr',
    bio: "Je ne mixe que le week-end mais j'y mets tout mon cœur.",
    avatar: null,
  },
  {
    pseudo: 'rhum_lover',
    email: 'rhum@caraibe.fr',
    bio: "Rhum agricole, rhum ambré, rhum blanc… j'aime toutes les déclinaisons du rhum.",
    avatar: null,
  },
  {
    pseudo: 'soiree_chez_moi',
    email: 'soiree@maison.fr',
    bio: "J'organise des soirées presque chaque mois. Mes recettes sont pensées pour les grands groupes.",
    avatar: null,
  },
  {
    pseudo: 'ginandtonic_fan',
    email: 'gnt@gin.fr',
    bio: "Le gin&tonic c'est une religion. Je teste toutes les recettes et je suis tout le monde ici.",
    avatar: null,
  },
  {
    pseudo: 'la_shakeuseuse',
    email: 'shakeuseuse@bar.fr',
    bio: "Barista le jour, shakeuseuse la nuit. Spécialisée dans les cocktails féminins et élégants.",
    avatar: null,
  },
  {
    pseudo: 'zero_alcool',
    email: 'zero@mocktail.fr',
    bio: "Sobre mais festif ! Je prouve que les mocktails peuvent être aussi bons que les vrais.",
    avatar: null,
  },
];

// ──────────────────────────────────────────────
// Catégories
// ──────────────────────────────────────────────

const CATEGORIES_DATA = [
  'Classiques',
  'Punchs & Sangrias',
  'Tropicaux',
  'Modernes',
  'Légers & Pétillants',
  'Sans alcool',
];

// ──────────────────────────────────────────────
// Recettes
// ──────────────────────────────────────────────

const RECIPES_DATA = [
  {
    name: 'Mojito classique',
    description: "Le cocktail cubain par excellence. Fraîcheur et légèreté garanties avec la menthe fraîche et le citron vert.",
    category: 'Classiques',
    difficulty: 'EASY',
    prepTime: 5,
    servings: 1,
    imageUrl: '/uploads/cocktail_01.jpg',
    author: 'barman_felix',
    ingredients: [
      { name: 'rhum blanc', quantity: 50, unit: 'ml' },
      { name: 'jus de citron vert', quantity: 25, unit: 'ml' },
      { name: 'sirop de canne', quantity: 15, unit: 'ml' },
      { name: 'menthe fraîche', quantity: 8, unit: 'piece' },
      { name: 'eau gazeuse', quantity: 60, unit: 'ml' },
      { name: 'citron vert', quantity: 0.5, unit: 'piece' },
      { name: 'glace pilée', quantity: 4, unit: 'tbsp' },
    ],
    steps: [
      "Dans un verre, déposer 8 feuilles de menthe fraîche et 0,5 citron vert coupé en quartiers.",
      "Écraser délicatement avec un pilon (muddle) pour libérer les arômes de la menthe et le jus du citron.",
      "Ajouter 15 ml de sirop de canne et 50 ml de rhum blanc, puis mélanger brièvement.",
      "Remplir le verre de glace pilée jusqu'en haut.",
      "Compléter avec 60 ml d'eau gazeuse, mélanger doucement et décorer d'un brin de menthe.",
    ],
  },
  {
    name: 'Sangria maison',
    description: "La sangria espagnole familiale, idéale pour partager un été entre amis.",
    category: 'Punchs & Sangrias',
    difficulty: 'EASY',
    prepTime: 15,
    servings: 6,
    imageUrl: '/uploads/cocktail_02.jpg',
    author: 'soiree_chez_moi',
    ingredients: [
      { name: 'vin rouge', quantity: 750, unit: 'ml' },
      { name: 'brandy', quantity: 120, unit: 'ml' },
      { name: "jus d'orange", quantity: 300, unit: 'ml' },
      { name: 'sucre', quantity: 60, unit: 'g' },
      { name: 'citron', quantity: 1, unit: 'piece' },
      { name: 'orange', quantity: 1, unit: 'piece' },
      { name: 'pomme', quantity: 1, unit: 'piece' },
      { name: 'cannelle', quantity: 1, unit: 'piece' },
    ],
    steps: [
      "Dans un grand pichet, trancher finement 1 citron, 1 orange et 1 pomme.",
      "Ajouter 60 g de sucre, 120 ml de brandy et 300 ml de jus d'orange. Mélanger jusqu'à dissolution du sucre.",
      "Verser 750 ml de vin rouge et ajouter 1 bâton de cannelle. Mélanger délicatement.",
      "Laisser reposer au frais au minimum 2 heures avant de servir avec des glaçons.",
    ],
  },
  {
    name: 'Negroni',
    description: "Le classique amer de la mixologie italienne. Trois ingrédients, un équilibre parfait.",
    category: 'Classiques',
    difficulty: 'EASY',
    prepTime: 5,
    servings: 2,
    imageUrl: '/uploads/cocktail_03.jpg',
    author: 'barman_felix',
    ingredients: [
      { name: 'gin', quantity: 60, unit: 'ml' },
      { name: 'Campari', quantity: 60, unit: 'ml' },
      { name: 'vermouth rouge', quantity: 60, unit: 'ml' },
      { name: 'orange', quantity: 1, unit: 'piece' },
    ],
    steps: [
      "Dans un verre à mélange rempli de glaçons, verser 60 ml de gin, 60 ml de Campari et 60 ml de vermouth rouge.",
      "Mélanger avec une cuillère à bar pendant 20 à 30 secondes jusqu'à ce que le mélange soit bien frais.",
      "Passer dans deux verres Old Fashioned sur glaçons et garnir chacun d'un zeste d'orange pressé sur le bord du verre.",
    ],
  },
  {
    name: 'Punch tropical',
    description: "Un punch fruité et généreux pour régaler une grande tablée lors des soirées estivales.",
    category: 'Punchs & Sangrias',
    difficulty: 'EASY',
    prepTime: 20,
    servings: 10,
    imageUrl: '/uploads/cocktail_04.jpg',
    author: 'soiree_chez_moi',
    ingredients: [
      { name: 'rhum blanc', quantity: 500, unit: 'ml' },
      { name: "jus d'ananas", quantity: 1000, unit: 'ml' },
      { name: 'jus de mangue', quantity: 500, unit: 'ml' },
      { name: 'jus de citron vert', quantity: 200, unit: 'ml' },
      { name: 'sirop de grenadine', quantity: 100, unit: 'ml' },
      { name: 'ginger ale', quantity: 750, unit: 'ml' },
      { name: 'citron vert', quantity: 3, unit: 'piece' },
      { name: 'ananas', quantity: 5, unit: 'slice' },
    ],
    steps: [
      "Dans un grand bol à punch, mélanger 500 ml de rhum blanc, 1 L de jus d'ananas et 500 ml de jus de mangue.",
      "Ajouter 200 ml de jus de citron vert et 100 ml de sirop de grenadine. Bien mélanger.",
      "Réfrigérer au moins 1 heure. Au moment de servir, ajouter 750 ml de ginger ale pour la pétillance.",
      "Servir avec des glaçons et garnir de rondelles de citron vert et de tranches d'ananas.",
    ],
  },
  {
    name: 'Margarita',
    description: "Le cocktail tequila iconique avec son bord salé et son acidité parfaite.",
    category: 'Classiques',
    difficulty: 'MEDIUM',
    prepTime: 5,
    servings: 4,
    imageUrl: '/uploads/cocktail_05.jpg',
    author: 'la_shakeuseuse',
    ingredients: [
      { name: 'tequila', quantity: 240, unit: 'ml' },
      { name: 'triple sec', quantity: 120, unit: 'ml' },
      { name: 'jus de citron vert', quantity: 120, unit: 'ml' },
      { name: 'sel', quantity: 4, unit: 'pinch' },
      { name: 'citron vert', quantity: 4, unit: 'slice' },
      { name: 'glace', quantity: 8, unit: 'tbsp' },
    ],
    steps: [
      "Frotter le bord de chaque verre avec un quartier de citron vert, puis passer dans une assiette de sel.",
      "Dans un shaker avec des glaçons, combiner 240 ml de tequila, 120 ml de triple sec et 120 ml de jus de citron vert.",
      "Shaker vigoureusement pendant 15 secondes.",
      "Passer dans les verres préparés sur glace et garnir d'une rondelle de citron vert.",
    ],
  },
  {
    name: 'Espresso Martini',
    description: "Le cocktail à base de café pour les soirées qui commencent après le dîner.",
    category: 'Modernes',
    difficulty: 'MEDIUM',
    prepTime: 5,
    servings: 1,
    imageUrl: '/uploads/cocktail_06.jpg',
    author: 'barman_felix',
    ingredients: [
      { name: 'vodka', quantity: 50, unit: 'ml' },
      { name: 'Kahlúa', quantity: 25, unit: 'ml' },
      { name: 'espresso', quantity: 30, unit: 'ml' },
      { name: 'sirop de sucre', quantity: 10, unit: 'ml' },
      { name: 'grains de café', quantity: 3, unit: 'piece' },
    ],
    steps: [
      "Préparer 30 ml d'espresso bien serré et laisser refroidir légèrement.",
      "Dans un shaker rempli de glaçons, combiner la vodka (50 ml), le Kahlúa (25 ml), l'espresso et 10 ml de sirop de sucre.",
      "Shaker très vigoureusement pendant 20 secondes pour créer une mousse crémeuse.",
      "Passer à travers une passoire fine dans un verre à Martini pré-refroidi. Décorer de 3 grains de café sur la mousse.",
    ],
  },
  {
    name: 'Piña Colada',
    description: "Le goût des Caraïbes en verre : onctueux, tropical et désaltérant.",
    category: 'Tropicaux',
    difficulty: 'EASY',
    prepTime: 5,
    servings: 3,
    imageUrl: '/uploads/cocktail_07.jpg',
    author: 'rhum_lover',
    ingredients: [
      { name: 'rhum blanc', quantity: 150, unit: 'ml' },
      { name: 'lait de coco', quantity: 90, unit: 'ml' },
      { name: "jus d'ananas", quantity: 120, unit: 'ml' },
      { name: 'ananas frais', quantity: 3, unit: 'slice' },
      { name: 'glace pilée', quantity: 6, unit: 'tbsp' },
    ],
    steps: [
      "Dans un blender, combiner 150 ml de rhum blanc, 90 ml de lait de coco et 120 ml de jus d'ananas.",
      "Ajouter 3 tranches d'ananas frais et 6 cuillères à soupe de glace pilée.",
      "Mixer à vitesse maximale jusqu'à obtenir une texture lisse et crémeuse. Verser dans 3 verres refroidis et garnir d'une tranche d'ananas.",
    ],
  },
  {
    name: 'Whisky Sour',
    description: "Un équilibre parfait entre le caractère boisé du bourbon et l'acidité du citron.",
    category: 'Classiques',
    difficulty: 'MEDIUM',
    prepTime: 5,
    servings: 2,
    imageUrl: '/uploads/cocktail_08.jpg',
    author: 'barman_felix',
    ingredients: [
      { name: 'bourbon', quantity: 120, unit: 'ml' },
      { name: 'jus de citron frais', quantity: 60, unit: 'ml' },
      { name: 'sirop de sucre', quantity: 30, unit: 'ml' },
      { name: "blanc d'oeuf", quantity: 1, unit: 'piece' },
      { name: 'Angostura bitters', quantity: 2, unit: 'dash' },
    ],
    steps: [
      "Dans un shaker sans glaçons, combiner 120 ml de bourbon, 60 ml de jus de citron frais, 30 ml de sirop de sucre et 1 blanc d'oeuf.",
      "Shaker vigoureusement pendant 30 secondes sans glace (dry shake) pour émulsionner le blanc d'oeuf.",
      "Ajouter des glaçons dans le shaker et shaker à nouveau pendant 15 secondes.",
      "Passer dans 2 verres Old Fashioned. Déposer 1 trait d'Angostura bitters sur la mousse et servir.",
    ],
  },
  {
    name: 'Spritz Aperol',
    description: "L'incontournable de l'apéro moderne, léger et pétillant.",
    category: 'Légers & Pétillants',
    difficulty: 'EASY',
    prepTime: 3,
    servings: 4,
    imageUrl: '/uploads/cocktail_09.jpg',
    author: 'cocktail_addict',
    ingredients: [
      { name: 'Aperol', quantity: 240, unit: 'ml' },
      { name: 'prosecco', quantity: 360, unit: 'ml' },
      { name: 'eau gazeuse', quantity: 120, unit: 'ml' },
      { name: 'orange', quantity: 4, unit: 'slice' },
      { name: 'glaçons', quantity: 8, unit: 'piece' },
    ],
    steps: [
      "Remplir 4 grands verres à vin de glaçons.",
      "Verser 60 ml d'Aperol dans chaque verre, puis 90 ml de prosecco.",
      "Compléter avec 30 ml d'eau gazeuse, mélanger délicatement et garnir d'une rondelle d'orange.",
    ],
  },
  {
    name: 'Dark & Stormy',
    description: "Un cocktail corsé aux notes de gingembre et de rhum ambré.",
    category: 'Tropicaux',
    difficulty: 'EASY',
    prepTime: 3,
    servings: 1,
    imageUrl: '/uploads/cocktail_10.jpg',
    author: 'rhum_lover',
    ingredients: [
      { name: "rhum brun Gosling's", quantity: 60, unit: 'ml' },
      { name: 'ginger beer', quantity: 120, unit: 'ml' },
      { name: 'jus de citron vert', quantity: 15, unit: 'ml' },
      { name: 'citron vert', quantity: 1, unit: 'slice' },
    ],
    steps: [
      "Remplir un verre highball de glaçons et presser 15 ml de jus de citron vert.",
      "Verser 60 ml de rhum brun Gosling's sur les glaçons.",
      "Compléter doucement avec 120 ml de ginger beer pour créer un dégradé. Garnir d'une rondelle de citron vert.",
    ],
  },
  {
    name: 'French 75',
    description: "Une bulle d'élégance pour célébrer les belles occasions.",
    category: 'Classiques',
    difficulty: 'MEDIUM',
    prepTime: 5,
    servings: 6,
    imageUrl: '/uploads/1773271462908-159116.webp',
    author: 'la_shakeuseuse',
    ingredients: [
      { name: 'gin', quantity: 180, unit: 'ml' },
      { name: 'jus de citron', quantity: 90, unit: 'ml' },
      { name: 'sirop de sucre', quantity: 60, unit: 'ml' },
      { name: 'champagne', quantity: 450, unit: 'ml' },
      { name: 'citron', quantity: 2, unit: 'piece' },
    ],
    steps: [
      "Dans un shaker avec glaçons, combiner 180 ml de gin, 90 ml de jus de citron et 60 ml de sirop de sucre.",
      "Shaker vigoureusement pendant 15 secondes.",
      "Passer le mélange dans 6 flûtes à champagne.",
      "Compléter chaque verre avec environ 75 ml de champagne bien frais. Garnir d'un zeste de citron.",
    ],
  },
  {
    name: 'Mocktail Sunrise',
    description: "Toute la fraîcheur d'un sunrise sans alcool, avec le jeu de couleurs du dégradé grenadine.",
    category: 'Sans alcool',
    difficulty: 'EASY',
    prepTime: 3,
    servings: 2,
    imageUrl: '/uploads/1773408049502-698906.webp',
    author: 'zero_alcool',
    ingredients: [
      { name: "jus d'orange", quantity: 240, unit: 'ml' },
      { name: 'jus de grenade', quantity: 60, unit: 'ml' },
      { name: 'ginger ale', quantity: 120, unit: 'ml' },
      { name: 'orange', quantity: 2, unit: 'slice' },
      { name: 'grenadine', quantity: 2, unit: 'tsp' },
    ],
    steps: [
      "Remplir 2 grands verres de glaçons et verser 120 ml de jus d'orange dans chacun.",
      "Ajouter délicatement 30 ml de jus de grenade le long du bord du verre pour créer un dégradé.",
      "Compléter avec 60 ml de ginger ale, déposer 1 cuillère à café de grenadine et garnir d'une rondelle d'orange.",
    ],
  },
];

// ──────────────────────────────────────────────
// Relations de follow [followeur, suivi]
// ──────────────────────────────────────────────

const FOLLOWS_DATA = [
  // ginandtonic_fan suit tout le monde (7 follows)
  ['ginandtonic_fan', 'barman_felix'],
  ['ginandtonic_fan', 'cocktail_addict'],
  ['ginandtonic_fan', 'weekendmixer'],
  ['ginandtonic_fan', 'rhum_lover'],
  ['ginandtonic_fan', 'soiree_chez_moi'],
  ['ginandtonic_fan', 'la_shakeuseuse'],
  ['ginandtonic_fan', 'zero_alcool'],
  // barman_felix suivi par 5 autres (+ ginandtonic_fan = 6 total)
  ['cocktail_addict', 'barman_felix'],
  ['weekendmixer', 'barman_felix'],
  ['rhum_lover', 'barman_felix'],
  ['soiree_chez_moi', 'barman_felix'],
  ['la_shakeuseuse', 'barman_felix'],
  // autres follows croisés (2-4 par user)
  ['cocktail_addict', 'rhum_lover'],
  ['cocktail_addict', 'la_shakeuseuse'],
  ['weekendmixer', 'soiree_chez_moi'],
  ['weekendmixer', 'cocktail_addict'],
  ['rhum_lover', 'la_shakeuseuse'],
  ['rhum_lover', 'weekendmixer'],
  ['soiree_chez_moi', 'cocktail_addict'],
  ['soiree_chez_moi', 'la_shakeuseuse'],
  ['soiree_chez_moi', 'rhum_lover'],
  ['la_shakeuseuse', 'cocktail_addict'],
  ['la_shakeuseuse', 'weekendmixer'],
  // zero_alcool suit 3 personnes dont ginandtonic_fan (qui est suivi par 1 = zero_alcool)
  ['zero_alcool', 'la_shakeuseuse'],
  ['zero_alcool', 'cocktail_addict'],
  ['zero_alcool', 'ginandtonic_fan'],
];

// ──────────────────────────────────────────────
// Commentaires { recipe, user, content }
// Règle : l'auteur de la recette ne peut pas commenter sa propre recette
// ──────────────────────────────────────────────

const COMMENTS_DATA = [
  // Mojito classique (auteur: barman_felix) — 4 commentaires
  { recipe: 'Mojito classique', user: 'cocktail_addict', content: "Parfait pour l'été, j'adore la touche de menthe !" },
  { recipe: 'Mojito classique', user: 'rhum_lover', content: "Le mojito ultime, rien à dire." },
  { recipe: 'Mojito classique', user: 'la_shakeuseuse', content: "Bien équilibré, le sirop de canne fait toute la différence." },
  { recipe: 'Mojito classique', user: 'weekendmixer', content: "Sympa mais j'aurais mis un peu plus de citron." },
  // Sangria maison (auteur: soiree_chez_moi) — 4 commentaires
  { recipe: 'Sangria maison', user: 'barman_felix', content: "Belle sangria maison, la cannelle donne du caractère." },
  { recipe: 'Sangria maison', user: 'cocktail_addict', content: "Idéale pour les soirées, j'ai fait le double de la recette !" },
  { recipe: 'Sangria maison', user: 'ginandtonic_fan', content: "Bonne base mais un peu trop sucrée à mon goût." },
  { recipe: 'Sangria maison', user: 'zero_alcool', content: "J'ai remplacé le brandy par du jus de pomme, top aussi !" },
  // Negroni (auteur: barman_felix) — 4 commentaires
  { recipe: 'Negroni', user: 'cocktail_addict', content: "Le classique des classiques. Impeccable." },
  { recipe: 'Negroni', user: 'ginandtonic_fan', content: "Amer comme il faut, j'adore." },
  { recipe: 'Negroni', user: 'la_shakeuseuse', content: "Le zeste d'orange est essentiel, ne surtout pas l'oublier !" },
  { recipe: 'Negroni', user: 'rhum_lover', content: "Puissant mais bon. À siroter lentement." },
  // Punch tropical (auteur: soiree_chez_moi) — 2 commentaires
  { recipe: 'Punch tropical', user: 'barman_felix', content: "Impressionnant pour une grande tablée, tous ravis." },
  { recipe: 'Punch tropical', user: 'rhum_lover', content: "Le ginger ale final donne une belle fraîcheur." },
  // Margarita (auteur: la_shakeuseuse) — 4 commentaires
  { recipe: 'Margarita', user: 'barman_felix', content: "Belle exécution, le sel sur le bord c'est indispensable." },
  { recipe: 'Margarita', user: 'cocktail_addict', content: "Excellent ! Le triple sec apporte du moelleux." },
  { recipe: 'Margarita', user: 'rhum_lover', content: "Un peu moins de citron pour moi la prochaine fois." },
  { recipe: 'Margarita', user: 'ginandtonic_fan', content: "Super recette, mes invités ont adoré." },
  // Espresso Martini (auteur: barman_felix) — 2 commentaires
  { recipe: 'Espresso Martini', user: 'la_shakeuseuse', content: "Parfait après le dîner, l'espresso frais fait toute la différence." },
  { recipe: 'Espresso Martini', user: 'cocktail_addict', content: "Les grains de café en déco c'est le détail qui tue." },
  // Piña Colada (auteur: rhum_lover) — 3 commentaires
  { recipe: 'Piña Colada', user: 'barman_felix', content: "Crémeux et tropical, parfait en vacances !" },
  { recipe: 'Piña Colada', user: 'cocktail_addict', content: "Le lait de coco change tout par rapport à la crème." },
  { recipe: 'Piña Colada', user: 'la_shakeuseuse', content: "Recette fidèle à l'original, bravo." },
  // Whisky Sour (auteur: barman_felix) — 2 commentaires
  { recipe: 'Whisky Sour', user: 'rhum_lover', content: "Le blanc d'oeuf donne une texture soyeuse incroyable." },
  { recipe: 'Whisky Sour', user: 'weekendmixer', content: "Surpris par le résultat, vraiment bien équilibré." },
  // Spritz Aperol (auteur: cocktail_addict) — 3 commentaires
  { recipe: 'Spritz Aperol', user: 'barman_felix', content: "Simple et efficace pour l'apéro." },
  { recipe: 'Spritz Aperol', user: 'la_shakeuseuse', content: "Les proportions sont bonnes, ni trop amer ni trop doux." },
  { recipe: 'Spritz Aperol', user: 'weekendmixer', content: "Incontournable de l'été !" },
  // Dark & Stormy (auteur: rhum_lover) — 1 commentaire
  { recipe: 'Dark & Stormy', user: 'barman_felix', content: "Le ginger beer bien piquant est essentiel pour ce cocktail." },
  // French 75 (auteur: la_shakeuseuse) — 2 commentaires
  { recipe: 'French 75', user: 'barman_felix', content: "Élégant et festif. Parfait pour célébrer." },
  { recipe: 'French 75', user: 'cocktail_addict', content: "Le champagne apporte une légèreté délicieuse." },
  // Mocktail Sunrise (auteur: zero_alcool) — 2 commentaires
  { recipe: 'Mocktail Sunrise', user: 'cocktail_addict', content: "Zéro alcool mais plein de saveurs, bravo !" },
  { recipe: 'Mocktail Sunrise', user: 'soiree_chez_moi', content: "Idéal pour les non-buveurs lors des soirées." },
];

// ──────────────────────────────────────────────
// Notes { recipe, user, score }
// Moyennes cibles : 4.25, 4.0, 4.5, 3.5, 4.0, 4.0, 4.33, 3.67, 4.0, 4.5, 3.67, 3.5
// ──────────────────────────────────────────────

const RATINGS_DATA = [
  // Mojito classique → (5+5+4+3)/4 = 4.25
  { recipe: 'Mojito classique', user: 'cocktail_addict', score: 5 },
  { recipe: 'Mojito classique', user: 'rhum_lover', score: 5 },
  { recipe: 'Mojito classique', user: 'la_shakeuseuse', score: 4 },
  { recipe: 'Mojito classique', user: 'weekendmixer', score: 3 },
  // Sangria maison → (5+4+3+4)/4 = 4.0
  { recipe: 'Sangria maison', user: 'barman_felix', score: 5 },
  { recipe: 'Sangria maison', user: 'cocktail_addict', score: 4 },
  { recipe: 'Sangria maison', user: 'ginandtonic_fan', score: 3 },
  { recipe: 'Sangria maison', user: 'zero_alcool', score: 4 },
  // Negroni → (5+5+4+4)/4 = 4.5
  { recipe: 'Negroni', user: 'cocktail_addict', score: 5 },
  { recipe: 'Negroni', user: 'ginandtonic_fan', score: 5 },
  { recipe: 'Negroni', user: 'la_shakeuseuse', score: 4 },
  { recipe: 'Negroni', user: 'rhum_lover', score: 4 },
  // Punch tropical → (3+4)/2 = 3.5
  { recipe: 'Punch tropical', user: 'barman_felix', score: 3 },
  { recipe: 'Punch tropical', user: 'rhum_lover', score: 4 },
  // Margarita → (3+5+4+4)/4 = 4.0
  { recipe: 'Margarita', user: 'barman_felix', score: 3 },
  { recipe: 'Margarita', user: 'cocktail_addict', score: 5 },
  { recipe: 'Margarita', user: 'rhum_lover', score: 4 },
  { recipe: 'Margarita', user: 'ginandtonic_fan', score: 4 },
  // Espresso Martini → (5+4+3)/3 = 4.0
  { recipe: 'Espresso Martini', user: 'la_shakeuseuse', score: 5 },
  { recipe: 'Espresso Martini', user: 'cocktail_addict', score: 4 },
  { recipe: 'Espresso Martini', user: 'rhum_lover', score: 3 },
  // Piña Colada → (4+5+4)/3 ≈ 4.33
  { recipe: 'Piña Colada', user: 'barman_felix', score: 4 },
  { recipe: 'Piña Colada', user: 'cocktail_addict', score: 5 },
  { recipe: 'Piña Colada', user: 'la_shakeuseuse', score: 4 },
  // Whisky Sour → (5+3+3)/3 ≈ 3.67
  { recipe: 'Whisky Sour', user: 'rhum_lover', score: 5 },
  { recipe: 'Whisky Sour', user: 'weekendmixer', score: 3 },
  { recipe: 'Whisky Sour', user: 'ginandtonic_fan', score: 3 },
  // Spritz Aperol → (3+4+5+4)/4 = 4.0
  { recipe: 'Spritz Aperol', user: 'barman_felix', score: 3 },
  { recipe: 'Spritz Aperol', user: 'la_shakeuseuse', score: 4 },
  { recipe: 'Spritz Aperol', user: 'weekendmixer', score: 5 },
  { recipe: 'Spritz Aperol', user: 'soiree_chez_moi', score: 4 },
  // Dark & Stormy → (5+4)/2 = 4.5
  { recipe: 'Dark & Stormy', user: 'barman_felix', score: 5 },
  { recipe: 'Dark & Stormy', user: 'weekendmixer', score: 4 },
  // French 75 → (5+4+2)/3 ≈ 3.67
  { recipe: 'French 75', user: 'barman_felix', score: 5 },
  { recipe: 'French 75', user: 'cocktail_addict', score: 4 },
  { recipe: 'French 75', user: 'weekendmixer', score: 2 },
  // Mocktail Sunrise → (4+3)/2 = 3.5
  { recipe: 'Mocktail Sunrise', user: 'cocktail_addict', score: 4 },
  { recipe: 'Mocktail Sunrise', user: 'soiree_chez_moi', score: 3 },
];

// ──────────────────────────────────────────────
// Script principal
// ──────────────────────────────────────────────

async function main() {
  console.log('🌱 Démarrage du seed réaliste...\n');

  // 1. Hash unique pour tous les utilisateurs
  console.log('🔐 Génération du hash de mot de passe...');
  const passwordHash = await bcrypt.hash('password123', 10);

  // 2. Upsert des utilisateurs
  console.log('👤 Upsert des utilisateurs...');
  const userMap = {};
  for (const u of USERS_DATA) {
    const user = await prisma.user.upsert({
      where: { pseudo: u.pseudo },
      create: {
        pseudo: u.pseudo,
        email: u.email,
        passwordHash,
        bio: u.bio,
        avatar: u.avatar,
      },
      update: {
        bio: u.bio,
        avatar: u.avatar,
      },
    });
    userMap[u.pseudo] = user.id;
    console.log(`  ✓ ${u.pseudo} (id: ${user.id})`);
  }

  // 3. Upsert des catégories
  console.log('\n📂 Upsert des catégories...');
  const categoryMap = {};
  for (const name of CATEGORIES_DATA) {
    const cat = await prisma.category.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    categoryMap[name] = cat.id;
    console.log(`  ✓ ${name}`);
  }

  // 4. Suppression puis recréation des 12 recettes (pas de @unique sur name)
  console.log('\n🍹 Suppression des recettes existantes (si déjà seedées)...');
  const recipeNames = RECIPES_DATA.map(r => r.name);
  const existing = await prisma.recipe.findMany({ where: { name: { in: recipeNames } }, select: { id: true } });
  const existingIds = existing.map(r => r.id);
  if (existingIds.length > 0) {
    await prisma.comment.deleteMany({ where: { recipeId: { in: existingIds } } });
    await prisma.rating.deleteMany({ where: { recipeId: { in: existingIds } } });
    await prisma.favorite.deleteMany({ where: { recipeId: { in: existingIds } } });
    await prisma.recipeIngredient.deleteMany({ where: { recipeId: { in: existingIds } } });
    await prisma.step.deleteMany({ where: { recipeId: { in: existingIds } } });
    await prisma.recipe.deleteMany({ where: { id: { in: existingIds } } });
    console.log(`  ${existingIds.length} recette(s) supprimée(s).`);
  }

  // 5. Création des recettes avec ingrédients et étapes
  console.log('\n🍹 Création des recettes...');
  const recipeMap = {};
  for (const r of RECIPES_DATA) {
    // Upsert des ingrédients de cette recette
    const ingredientIds = [];
    for (const ing of r.ingredients) {
      const ingredient = await prisma.ingredient.upsert({
        where: { name: ing.name },
        create: { name: ing.name },
        update: {},
      });
      ingredientIds.push({ quantity: ing.quantity, unit: ing.unit, ingredientId: ingredient.id });
    }

    const recipe = await prisma.recipe.create({
      data: {
        name: r.name,
        description: r.description,
        difficulty: r.difficulty,
        prepTime: r.prepTime,
        servings: r.servings,
        imageUrl: r.imageUrl,
        status: 'PUBLISHED',
        categoryId: categoryMap[r.category],
        authorId: userMap[r.author],
        ingredients: {
          create: ingredientIds.map(({ quantity, unit, ingredientId }) => ({
            quantity,
            unit,
            ingredient: { connect: { id: ingredientId } },
          })),
        },
        steps: {
          create: r.steps.map((description, i) => ({ order: i + 1, description })),
        },
      },
    });

    recipeMap[r.name] = recipe.id;
    console.log(`  ✓ ${recipe.name}`);
  }

  // 6. Follows
  console.log('\n👥 Création des follows...');
  let followCount = 0;
  for (const [followerPseudo, followingPseudo] of FOLLOWS_DATA) {
    await prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId: userMap[followerPseudo],
          followingId: userMap[followingPseudo],
        },
      },
      create: {
        followerId: userMap[followerPseudo],
        followingId: userMap[followingPseudo],
      },
      update: {},
    });
    followCount++;
  }
  console.log(`  ✓ ${followCount} relations de follow créées.`);

  // 7. Commentaires
  console.log('\n💬 Création des commentaires...');
  for (const c of COMMENTS_DATA) {
    await prisma.comment.upsert({
      where: {
        userId_recipeId: {
          userId: userMap[c.user],
          recipeId: recipeMap[c.recipe],
        },
      },
      create: {
        content: c.content,
        userId: userMap[c.user],
        recipeId: recipeMap[c.recipe],
      },
      update: { content: c.content },
    });
  }
  console.log(`  ✓ ${COMMENTS_DATA.length} commentaires créés.`);

  // 8. Notes
  console.log('\n⭐ Création des notes...');
  for (const r of RATINGS_DATA) {
    await prisma.rating.upsert({
      where: {
        userId_recipeId: {
          userId: userMap[r.user],
          recipeId: recipeMap[r.recipe],
        },
      },
      create: {
        score: r.score,
        userId: userMap[r.user],
        recipeId: recipeMap[r.recipe],
      },
      update: { score: r.score },
    });
  }
  console.log(`  ✓ ${RATINGS_DATA.length} notes créées.`);

  console.log('\n✅ Seed réaliste terminé !');
  console.log(`   ${USERS_DATA.length} utilisateurs, ${RECIPES_DATA.length} recettes, ${FOLLOWS_DATA.length} follows`);
  console.log(`   ${COMMENTS_DATA.length} commentaires, ${RATINGS_DATA.length} notes`);
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
