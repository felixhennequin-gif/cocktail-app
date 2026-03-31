const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const prisma = require('../src/prisma');
const { JWT_SECRET } = require('../src/middleware/auth');

// Vide toutes les tables dans l'ordre correct (FK)
const cleanDb = async () => {
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

// Crée une recette de test minimale
const createTestRecipe = async ({ authorId = null, categoryId, status = 'PUBLISHED', name = 'Test Mojito' } = {}) => {
  return prisma.recipe.create({
    data: { name, difficulty: 'EASY', prepTime: 5, categoryId, authorId, status },
  });
};

// Header Authorization pour supertest
const getAuthHeader = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { cleanDb, createTestUser, createTestCategory, createTestRecipe, getAuthHeader };
