// Seed des badges — node prisma/seed-badges.js
require('dotenv').config();
const prisma = require('../src/prisma');

const badges = [
  { code: 'first_recipe',   name: 'Première recette',     description: 'Publier sa première recette',        icon: '\uD83C\uDF79', condition: 'published_recipes', threshold: 1 },
  { code: 'recipes_5',      name: '5 recettes',           description: 'Publier 5 recettes',                 icon: '\uD83C\uDFC6', condition: 'published_recipes', threshold: 5 },
  { code: 'recipes_10',     name: '10 recettes',          description: 'Publier 10 recettes',                icon: '\uD83D\uDC68\u200D\uD83C\uDF73', condition: 'published_recipes', threshold: 10 },
  { code: 'first_rating',   name: 'Première note',        description: 'Donner sa première note',            icon: '\u2B50',       condition: 'ratings_given',     threshold: 1 },
  { code: 'ratings_10',     name: '10 notes',             description: 'Donner 10 notes',                    icon: '\uD83C\uDF1F', condition: 'ratings_given',     threshold: 10 },
  { code: 'ratings_50',     name: '50 notes',             description: 'Donner 50 notes',                    icon: '\uD83D\uDCAB', condition: 'ratings_given',     threshold: 50 },
  { code: 'first_comment',  name: 'Premier commentaire',  description: 'Poster son premier commentaire',     icon: '\uD83D\uDCAC', condition: 'comments_posted',   threshold: 1 },
  { code: 'comments_10',    name: '10 commentaires',      description: 'Poster 10 commentaires',             icon: '\uD83D\uDCDD', condition: 'comments_posted',   threshold: 10 },
  { code: 'first_follower', name: 'Premier abonné',       description: 'Obtenir son premier abonné',         icon: '\uD83D\uDC64', condition: 'followers_count',   threshold: 1 },
  { code: 'followers_10',   name: '10 abonnés',           description: 'Obtenir 10 abonnés',                 icon: '\uD83D\uDC65', condition: 'followers_count',   threshold: 10 },
  { code: 'first_favorite',  name: 'Premier favori reçu',  description: 'Recevoir un favori sur une recette', icon: '\u2764\uFE0F', condition: 'favorites_received', threshold: 1 },
  { code: 'favorites_50',   name: '50 favoris reçus',     description: 'Recevoir 50 favoris sur ses recettes', icon: '\uD83D\uDD25', condition: 'favorites_received', threshold: 50 },
];

async function main() {
  console.log('Seeding badges...');
  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      create: badge,
      update: badge,
    });
  }
  console.log(`${badges.length} badges upsertés.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
