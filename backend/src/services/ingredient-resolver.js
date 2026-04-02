// Résolution d'ingrédients : accepte { ingredientId } OU { name } (upsert)
const prisma = require('../prisma');

const resolveIngredients = async (ingredients) => {
  return Promise.all(
    ingredients.map(async ({ ingredientId, name, quantity, unit }) => {
      if (name) {
        const ingredient = await prisma.ingredient.upsert({
          where: { name },
          create: { name },
          update: {},
        });
        return { id: ingredient.id, quantity, unit };
      }
      return { id: ingredientId, quantity, unit };
    })
  );
};

module.exports = { resolveIngredients };
