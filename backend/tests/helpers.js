const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const prisma = require('../src/prisma');
const JWT_SECRET = process.env.JWT_SECRET;

// Vide toutes les tables dans l'ordre correct (FK)
const cleanDb = async () => {
  // P6 tables
  await prisma.tastingLog.deleteMany();
  await prisma.ingredientSubstitution.deleteMany();
  await prisma.userStreak.deleteMany();
  await prisma.recipeRevision.deleteMany();
  await prisma.newsletterSubscription.deleteMany();
  await prisma.glossaryEntry.deleteMany();
  await prisma.challengeEntry.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.articleTag.deleteMany();
  await prisma.article.deleteMany();
  await prisma.userPreference.deleteMany();
  await prisma.userIngredient.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.technique.deleteMany();
  // Original tables
  await prisma.collectionRecipe.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.step.deleteMany();
  await prisma.recipeTag.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.user.deleteMany();
};

// Crée un utilisateur de test et retourne { user, token }
const createTestUser = async ({ pseudo, email, password = 'test1234', role = 'USER' } = {}) => {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { pseudo, email, passwordHash, role },
  });
  const token = jwt.sign({ id: user.id }, JWT_SECRET, {
    expiresIn: '7d',
  });
  return { user, token };
};

// Génère un slug à partir d'un nom
const slugify = (name) =>
  name.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

// Crée ou récupère une catégorie de test
const createTestCategory = async (name = 'Cocktails') => {
  return prisma.category.upsert({
    where:  { name },
    create: { name, slug: slugify(name) },
    update: {},
  });
};

// Compteur pour générer des slugs uniques dans les tests
let recipeSlugCounter = 0;

// Crée une recette de test minimale
const createTestRecipe = async ({ authorId = null, categoryId, status = 'PUBLISHED', name = 'Test Mojito' } = {}) => {
  const slug = `${slugify(name)}-${++recipeSlugCounter}-${Date.now()}`;
  return prisma.recipe.create({
    data: { name, slug, difficulty: 'EASY', prepTime: 5, categoryId, authorId, status },
  });
};

// Header Authorization pour supertest
const getAuthHeader = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { cleanDb, createTestUser, createTestCategory, createTestRecipe, getAuthHeader };
