const prisma = require('../prisma');
const { createArticleSchema, updateArticleSchema, formatZodError } = require('../schemas');
const { invalidateCacheByPattern } = require('../cache');
const { slugify, uniqueSlug } = require('../utils/slugify');
const { notFound, badRequest } = require('../helpers/errors');

// Inclure les données author et tags dans toutes les réponses
const articleInclude = {
  author: { select: { id: true, pseudo: true, avatar: true } },
  tags:   { include: { tag: { select: { id: true, name: true } } } },
};

// GET /articles — liste les articles publiés, paginés
const getArticles = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip  = (page - 1) * limit;

    const where = { status: 'PUBLISHED' };

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { publishedAt: 'desc' },
        include: articleInclude,
      }),
      prisma.article.count({ where }),
    ]);

    res.json({
      articles: articles.map(normalizeArticle),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

// GET /articles/:slug — article par slug (publié ou admin)
const getArticleBySlug = async (req, res, next) => {
  try {
    const article = await prisma.article.findUnique({
      where:   { slug: req.params.slug },
      include: articleInclude,
    });

    if (!article) return notFound(res, 'Article introuvable');

    // Les drafts ne sont accessibles qu'aux admins
    if (article.status === 'DRAFT') {
      const user = req.user;
      if (!user || user.role !== 'ADMIN') {
        return notFound(res, 'Article introuvable');
      }
    }

    res.json(normalizeArticle(article));
  } catch (err) {
    next(err);
  }
};

// POST /articles [admin] — créer un article
const createArticle = async (req, res, next) => {
  try {
    const parsed = createArticleSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, formatZodError(parsed.error));
    }

    const { title, content, excerpt, coverImage, status = 'DRAFT', tagIds = [] } = parsed.data;
    const base = slugify(title);
    const slug = await uniqueSlug(base, prisma, 'article');

    const article = await prisma.article.create({
      data: {
        title,
        slug,
        content,
        excerpt,
        coverImage: coverImage ?? null,
        status,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
        authorId:    req.user.id,
        tags: tagIds.length
          ? { create: tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: articleInclude,
    });

    // Invalider le cache liste des articles
    await invalidateCacheByPattern('GET:/api/articles*');

    res.status(201).json(normalizeArticle(article));
  } catch (err) {
    next(err);
  }
};

// PUT /articles/:slug [admin] — modifier un article
const updateArticle = async (req, res, next) => {
  try {
    const existing = await prisma.article.findUnique({ where: { slug: req.params.slug } });
    if (!existing) return notFound(res, 'Article introuvable');

    const parsed = updateArticleSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, formatZodError(parsed.error));
    }

    const { title, content, excerpt, coverImage, status, tagIds } = parsed.data;

    // Recalcul du slug uniquement si le titre change
    let slug = existing.slug;
    if (title && title !== existing.title) {
      const base = slugify(title);
      slug = await uniqueSlug(base, prisma, 'article', existing.id);
    }

    // Gestion du publishedAt : on le positionne seulement au premier passage en PUBLISHED
    let publishedAt = existing.publishedAt;
    if (status === 'PUBLISHED' && !publishedAt) {
      publishedAt = new Date();
    } else if (status === 'DRAFT') {
      publishedAt = null;
    }

    const article = await prisma.article.update({
      where: { id: existing.id },
      data: {
        ...(title      !== undefined && { title }),
        ...(slug       !== existing.slug && { slug }),
        ...(content    !== undefined && { content }),
        ...(excerpt    !== undefined && { excerpt }),
        ...(coverImage !== undefined && { coverImage: coverImage ?? null }),
        ...(status     !== undefined && { status }),
        publishedAt,
        // Remplacement complet des tags si fournis
        ...(tagIds !== undefined && {
          tags: {
            deleteMany: {},
            create: tagIds.map((tagId) => ({ tagId })),
          },
        }),
      },
      include: articleInclude,
    });

    await invalidateCacheByPattern('GET:/api/articles*');

    res.json(normalizeArticle(article));
  } catch (err) {
    next(err);
  }
};

// DELETE /articles/:slug [admin] — supprimer un article
const deleteArticle = async (req, res, next) => {
  try {
    const existing = await prisma.article.findUnique({ where: { slug: req.params.slug } });
    if (!existing) return notFound(res, 'Article introuvable');

    await prisma.article.delete({ where: { id: existing.id } });

    await invalidateCacheByPattern('GET:/api/articles*');

    res.json({ message: 'Article supprimé' });
  } catch (err) {
    next(err);
  }
};

// Normalise la réponse : aplatit les tags
const normalizeArticle = (article) => ({
  ...article,
  tags: article.tags.map((at) => at.tag),
});

module.exports = { getArticles, getArticleBySlug, createArticle, updateArticle, deleteArticle };
