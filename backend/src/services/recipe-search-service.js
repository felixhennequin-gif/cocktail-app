// Service de recherche de recettes — logique de requêtes et pagination
const { z } = require('zod');
const { Prisma } = require('@prisma/client');
const prisma = require('../prisma');
const { includeList, enrichRecipes } = require('../helpers/recipe-helpers');

// Schéma de validation des query params de GET /recipes
const recipeListSchema = z.object({
  page:       z.coerce.number().int().min(1).max(500).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
  q:          z.string().min(2).max(100).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  minRating:  z.coerce.number().min(0).max(5).optional(),
  maxTime:    z.coerce.number().int().positive().optional(),
  authorId:   z.coerce.number().int().positive().optional(),
  status:     z.enum(['PUBLISHED', 'PENDING', 'DRAFT']).optional(),
  tags:       z.string().optional(),
  sortBy:     z.enum(['createdAt', 'prepTime', 'avgRating', 'favoritesCount']).default('createdAt'),
  sortOrder:  z.enum(['asc', 'desc']).default('desc'),
});

// Calcule les compteurs de tags filtrés (sous-requête SQL via IDs capés)
const MAX_FACET_IDS = 5000;
const computeTagCounts = async (whereWithoutTags) => {
  const filteredIds = await prisma.recipe.findMany({
    where: whereWithoutTags,
    select: { id: true },
    take: MAX_FACET_IDS,
  });
  const ids = filteredIds.map(r => r.id);
  if (ids.length === 0) return [];
  return prisma.$queryRaw`
    SELECT t.id, t.name, COUNT(DISTINCT rt."recipeId")::int AS count
    FROM "Tag" t
    JOIN "RecipeTag" rt ON rt."tagId" = t.id
    WHERE rt."recipeId" = ANY(${ids}::int[])
    GROUP BY t.id, t.name
    ORDER BY count DESC
  `;
};

// Construit la clause where selon le contexte utilisateur
const buildWhereClause = ({ categoryId, maxTime, authorId, status, tags, user }) => {
  const where = {};

  if (user?.role === 'ADMIN' && status) {
    where.status = status;
  } else if (user?.role === 'ADMIN') {
    // admin sans filtre : voit tout
  } else if (status === 'DRAFT' && user) {
    where.status = 'DRAFT';
    where.authorId = user.id;
  } else {
    where.status = 'PUBLISHED';
  }

  if (categoryId !== undefined) where.categoryId = categoryId;
  if (maxTime    !== undefined) where.prepTime    = { lte: maxTime };
  if (authorId   !== undefined) where.authorId    = authorId;

  if (tags) {
    const tagIdList = tags.split(',').map(Number).filter(n => n > 0);
    if (tagIdList.length > 0) {
      where.AND = [
        ...(where.AND || []),
        ...tagIdList.map(tagId => ({ tags: { some: { tagId } } })),
      ];
    }
  }

  return where;
};

// Recherche avec requête textuelle (branche A)
const searchWithQuery = async ({ q, where, whereWithoutTags, minRatingIds, offset, limit, page }) => {
  const clean = q.replace(/[^a-zA-ZÀ-ÿ0-9 -]/g, ' ').trim();
  const tsquery = clean.split(/\s+/).filter(Boolean).map(w => `${w}:*`).join(' & ');

  const filterWhere = { ...where };
  if (minRatingIds !== null) {
    filterWhere.id = { in: minRatingIds.length > 0 ? minRatingIds : [-1] };
  }
  const facetWhere = { ...whereWithoutTags };
  if (minRatingIds !== null) {
    facetWhere.id = { in: minRatingIds.length > 0 ? minRatingIds : [-1] };
  }

  const [searchRows, filterRows, facetFilterRows] = await Promise.all([
    prisma.$queryRaw`
      SELECT id, ts_rank("searchVector", to_tsquery('french', ${tsquery})) AS rank
      FROM "Recipe"
      WHERE "searchVector" @@ to_tsquery('french', ${tsquery})
      ORDER BY rank DESC
    `,
    prisma.recipe.findMany({ where: filterWhere, select: { id: true } }),
    prisma.recipe.findMany({ where: facetWhere, select: { id: true } }),
  ]);

  const searchIds    = searchRows.map(r => r.id);
  const filterIdSet  = new Set(filterRows.map(r => r.id));
  const facetIds     = facetFilterRows.map(r => r.id);

  const orderedIds     = searchIds.filter(id => filterIdSet.has(id));
  const total          = orderedIds.length;
  const pageIds        = orderedIds.slice(offset, offset + limit);
  const facetSearchIds = searchIds.filter(id => facetIds.includes(id));

  const computeFacetTagCounts = async (ids) => {
    if (ids.length === 0) return [];
    return prisma.$queryRaw`
      SELECT t.id, t.name, COUNT(DISTINCT rt."recipeId")::int AS count
      FROM "Tag" t
      JOIN "RecipeTag" rt ON rt."tagId" = t.id
      WHERE rt."recipeId" = ANY(${ids}::int[])
      GROUP BY t.id, t.name
      ORDER BY count DESC
    `;
  };

  if (pageIds.length === 0) {
    const tagCounts = await computeFacetTagCounts(facetSearchIds);
    return { data: [], total, page, limit, tagCounts };
  }

  const [recipes, tagCounts] = await Promise.all([
    prisma.recipe.findMany({ where: { id: { in: pageIds } }, include: includeList }),
    computeFacetTagCounts(facetSearchIds),
  ]);

  const ranked = pageIds.map(id => recipes.find(r => r.id === id)).filter(Boolean);
  return { data: await enrichRecipes(ranked), total, page, limit, tagCounts };
};

// Recherche avec tri par agrégat (avgRating / favoritesCount)
const searchWithAggSort = async ({ where, whereWithoutTags, minRatingIds, sortBy, sortOrder, offset, limit, page }) => {
  const filteredRows = await prisma.recipe.findMany({ where, select: { id: true } });
  const filteredIds = filteredRows.map(r => r.id);

  const facetWhere = { ...whereWithoutTags };
  if (minRatingIds !== null) {
    facetWhere.id = { in: minRatingIds.length > 0 ? minRatingIds : [-1] };
  }

  if (filteredIds.length === 0) {
    const tagCounts = await computeTagCounts(facetWhere);
    return { data: [], total: 0, page, limit, tagCounts };
  }

  let orderFragment;
  if (sortBy === 'avgRating') {
    orderFragment = sortOrder === 'asc'
      ? Prisma.sql`ORDER BY "avg_rating" ASC NULLS FIRST, r.id DESC`
      : Prisma.sql`ORDER BY "avg_rating" DESC NULLS LAST, r.id DESC`;
  } else {
    orderFragment = sortOrder === 'asc'
      ? Prisma.sql`ORDER BY "fav_count" ASC, r.id DESC`
      : Prisma.sql`ORDER BY "fav_count" DESC, r.id DESC`;
  }

  const sortedRows = await prisma.$queryRaw`
    SELECT r.id,
      COALESCE(AVG(rt.score), NULL) AS "avg_rating",
      COUNT(DISTINCT f."userId")::int AS "fav_count"
    FROM "Recipe" r
    LEFT JOIN "Rating" rt ON rt."recipeId" = r.id
    LEFT JOIN "Favorite" f ON f."recipeId" = r.id
    WHERE r.id = ANY(${filteredIds}::int[])
    GROUP BY r.id
    ${orderFragment}
    LIMIT ${limit} OFFSET ${offset}
  `;

  const total = filteredIds.length;
  const pageIds = sortedRows.map(r => r.id);

  if (pageIds.length === 0) {
    const tagCounts = await computeTagCounts(facetWhere);
    return { data: [], total, page, limit, tagCounts };
  }

  const [recipes, tagCounts] = await Promise.all([
    prisma.recipe.findMany({ where: { id: { in: pageIds } }, include: includeList }),
    computeTagCounts(facetWhere),
  ]);

  const ordered = pageIds.map(id => recipes.find(r => r.id === id)).filter(Boolean);
  const data = await enrichRecipes(ordered);
  return { data, total, page, limit, tagCounts };
};

// Point d'entrée principal : recherche de recettes avec filtres, tri et pagination
const search = async (params) => {
  const { page, limit, q, categoryId, minRating, maxTime, authorId, status, tags, sortBy, sortOrder, user } = params;
  const offset = (page - 1) * limit;

  const where = buildWhereClause({ categoryId, maxTime, authorId, status, tags, user });

  // Snapshot du where SANS les tags pour les compteurs facettés
  const { AND: _andWithTags, ...whereBase } = where;
  const whereWithoutTags = { ...whereBase };

  // minRating : sous-requête raw
  let minRatingIds = null;
  if (minRating !== undefined) {
    const rows = await prisma.$queryRaw`
      SELECT "recipeId"::int FROM "Rating"
      GROUP BY "recipeId"
      HAVING AVG(score) >= ${minRating}
    `;
    minRatingIds = rows.map(r => r.recipeId);
  }

  // Branche A : recherche textuelle
  if (q) {
    return searchWithQuery({ q, where, whereWithoutTags, minRatingIds, offset, limit, page });
  }

  // Appliquer minRating aux where
  if (minRatingIds !== null) {
    where.id = { in: minRatingIds.length > 0 ? minRatingIds : [-1] };
  }

  // Branche B : tri par agrégat
  if (sortBy === 'avgRating' || sortBy === 'favoritesCount') {
    return searchWithAggSort({ where, whereWithoutTags, minRatingIds, sortBy, sortOrder, offset, limit, page });
  }

  // Branche C : tri standard Prisma
  const orderBy = { [sortBy]: sortOrder };
  const facetWhere = { ...whereWithoutTags };
  if (minRatingIds !== null) {
    facetWhere.id = { in: minRatingIds.length > 0 ? minRatingIds : [-1] };
  }

  const [recipes, total, tagCounts] = await Promise.all([
    prisma.recipe.findMany({ where, include: includeList, orderBy, skip: offset, take: limit }),
    prisma.recipe.count({ where }),
    computeTagCounts(facetWhere),
  ]);

  return { data: await enrichRecipes(recipes), total, page, limit, tagCounts };
};

module.exports = { recipeListSchema, search };
