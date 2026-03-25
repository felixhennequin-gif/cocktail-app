// Valide et parse un paramètre numérique (id). Retourne null si invalide.
const parseId = (value) => {
  const id = parseInt(value);
  if (isNaN(id) || id <= 0) return null;
  return id;
};

module.exports = { parseId };
