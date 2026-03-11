const prisma = require('../prisma');

// GET /categories
const getAllCategories = async (req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  });
  res.json(categories);
};

module.exports = { getAllCategories };
