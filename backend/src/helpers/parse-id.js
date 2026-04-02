// Valide et parse un paramètre numérique (id). Retourne null si invalide.
const parseId = (value) => {
  const id = parseInt(value);
  if (isNaN(id) || id <= 0) return null;
  return id;
};

const parseIdOrSlug = (value) => {
  if (!value) return null;
  const asInt = parseInt(value);
  if (!isNaN(asInt) && asInt > 0 && String(asInt) === value) return { id: asInt };
  return { slug: value };
};

module.exports = { parseId, parseIdOrSlug };
