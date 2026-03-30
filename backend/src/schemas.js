const { z } = require('zod');

// --- Recettes ---

const createRecipeSchema = z.object({
  name:           z.string().min(1, 'Le nom est requis').max(200, 'Le nom ne doit pas dépasser 200 caractères').transform(s => s.trim()),
  description:    z.string().max(5000, 'La description ne doit pas dépasser 5000 caractères').optional().nullable(),
  imageUrl:       z.string().optional().nullable(),
  difficulty:     z.enum(['EASY', 'MEDIUM', 'HARD'], { message: 'La difficulté doit être EASY, MEDIUM ou HARD' }),
  prepTime:       z.coerce.number().int().positive('Le temps de préparation doit être un nombre positif'),
  servings:       z.coerce.number().int().positive().optional().nullable(),
  categoryId:     z.coerce.number().int().positive('categoryId est requis'),
  ingredients:    z.array(z.object({
    ingredientId: z.number().int().positive().optional(),
    name:         z.string().optional(),
    quantity:     z.coerce.number(),
    unit:         z.string(),
  })).default([]),
  steps:          z.array(z.object({
    order:       z.coerce.number().int(),
    description: z.string().max(2000, 'La description d\'une étape ne doit pas dépasser 2000 caractères'),
    imageUrl:    z.string().optional(),
  })).default([]),
  tagIds:         z.array(z.number()).optional(),
  tagNames:       z.array(z.string()).optional(),
  parentRecipeId: z.coerce.number().int().positive().optional().nullable(),
  status:         z.enum(['PUBLISHED', 'PENDING', 'DRAFT']).optional(),
});

const updateRecipeSchema = createRecipeSchema.partial().omit({ ingredients: true, steps: true }).extend({
  ingredients: z.array(z.object({
    ingredientId: z.number().int().positive().optional(),
    name:         z.string().optional(),
    quantity:     z.coerce.number(),
    unit:         z.string(),
  })).optional(),
  steps: z.array(z.object({
    order:       z.coerce.number().int(),
    description: z.string().max(2000, 'La description d\'une étape ne doit pas dépasser 2000 caractères'),
    imageUrl:    z.string().optional(),
  })).optional(),
});

// --- Commentaires ---

const createCommentSchema = z.object({
  content: z.string().max(2000, 'Le commentaire ne doit pas dépasser 2000 caractères').transform(s => s.trim()).pipe(z.string().min(1, 'Le commentaire ne peut pas être vide')),
  score:   z.coerce.number().int().min(1, 'Une note entre 1 et 5 est obligatoire').max(5, 'Une note entre 1 et 5 est obligatoire'),
});

const updateCommentSchema = z.object({
  content: z.string().max(2000, 'Le commentaire ne doit pas dépasser 2000 caractères').transform(s => s.trim()).pipe(z.string().min(1, 'Le commentaire ne peut pas être vide')),
  score:   z.coerce.number().int().min(1, 'Le score doit être compris entre 1 et 5').max(5, 'Le score doit être compris entre 1 et 5').optional().nullable(),
});

// --- Collections ---

const createCollectionSchema = z.object({
  name:        z.string().min(1, 'Le nom est requis').max(100, 'Le nom ne doit pas dépasser 100 caractères').transform(s => s.trim()),
  description: z.string().max(500, 'La description ne doit pas dépasser 500 caractères').optional().nullable().transform(s => s?.trim() || null),
  isPublic:    z.boolean().default(true),
});

const updateCollectionSchema = z.object({
  name:        z.string().min(1, 'Le nom est requis').max(100, 'Le nom ne doit pas dépasser 100 caractères').transform(s => s.trim()).optional(),
  description: z.string().max(500, 'La description ne doit pas dépasser 500 caractères').optional().nullable().transform(s => s?.trim() || null),
  isPublic:    z.boolean().optional(),
});

// --- Profil utilisateur ---

const updateProfileSchema = z.object({
  pseudo: z.string().min(2, 'Le pseudo doit faire au moins 2 caractères').max(50, 'Le pseudo ne doit pas dépasser 50 caractères').transform(s => s.trim()).optional(),
  bio:    z.string().max(500, 'La bio ne doit pas dépasser 500 caractères').optional().nullable().transform(s => s?.trim() || null),
  avatar: z.string().optional().nullable(),
});

// --- Auth ---

const registerSchema = z.object({
  email:    z.string().email('Email invalide'),
  pseudo:   z.string().min(1, 'Le pseudo est requis'),
  password: z.string()
    .min(8, 'Le mot de passe doit faire au moins 8 caractères')
    .regex(/[a-zA-Z]/, 'Le mot de passe doit contenir au moins une lettre')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
});

const loginSchema = z.object({
  email:    z.string().min(1, 'email est requis'),
  password: z.string().min(1, 'password est requis'),
});

// --- Refresh Token ---

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requis'),
});

// --- Logout ---

const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requis'),
});

// --- Rating ---

const ratingSchema = z.object({
  score: z.coerce.number().int().min(1, 'Le score doit être compris entre 1 et 5').max(5, 'Le score doit être compris entre 1 et 5'),
});

// Helper : formatte les erreurs Zod en message lisible
const formatZodError = (error) => {
  const fieldErrors = error.flatten().fieldErrors;
  const messages = Object.values(fieldErrors).flat();
  return messages.length === 1 ? messages[0] : messages.join('. ');
};

module.exports = {
  createRecipeSchema,
  updateRecipeSchema,
  createCommentSchema,
  updateCommentSchema,
  createCollectionSchema,
  updateCollectionSchema,
  updateProfileSchema,
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  ratingSchema,
  formatZodError,
};
