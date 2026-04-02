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
  season:         z.enum(['spring', 'summer', 'autumn', 'winter']).optional().nullable(),
  status:         z.enum(['PUBLISHED', 'PENDING', 'DRAFT']).optional(),
  // Champs sponsoring (ignorés côté controller si l'utilisateur n'est pas ADMIN)
  sponsorName:    z.string().max(200).optional().nullable(),
  sponsorLogo:    z.string().optional().nullable(),
  isSponsored:    z.boolean().optional(),
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

// --- Vérification email ---

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token requis'),
});

// --- Changement de mot de passe (connecté) ---

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string()
    .min(8, 'Le mot de passe doit faire au moins 8 caractères')
    .regex(/[a-zA-Z]/, 'Le mot de passe doit contenir au moins une lettre')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
});

// --- Mot de passe oublié / reset ---

const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalide'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token requis'),
  password: z.string()
    .min(8, 'Le mot de passe doit faire au moins 8 caractères')
    .regex(/[a-zA-Z]/, 'Le mot de passe doit contenir au moins une lettre')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
});

// --- Challenges ---

const createChallengeSchema = z.object({
  title:       z.string().min(1, 'Le titre est requis').max(200, 'Le titre ne doit pas dépasser 200 caractères').transform(s => s.trim()),
  description: z.string().min(1, 'La description est requise').max(2000, 'La description ne doit pas dépasser 2000 caractères').transform(s => s.trim()),
  startDate:   z.string().min(1, 'La date de début est requise'),
  endDate:     z.string().min(1, 'La date de fin est requise'),
  tagId:       z.coerce.number().int().positive().optional().nullable(),
}).refine((data) => new Date(data.endDate) > new Date(data.startDate), {
  message: 'La date de fin doit être postérieure à la date de début',
  path: ['endDate'],
});

// --- Articles ---

const createArticleSchema = z.object({
  title:      z.string().min(1, 'Le titre est requis').max(200, 'Le titre ne doit pas dépasser 200 caractères').transform(s => s.trim()),
  content:    z.string().min(1, 'Le contenu est requis').max(50000, 'Le contenu ne doit pas dépasser 50 000 caractères'),
  excerpt:    z.string().min(1, 'L\'extrait est requis').max(500, 'L\'extrait ne doit pas dépasser 500 caractères').transform(s => s.trim()),
  coverImage: z.string().optional().nullable(),
  status:     z.enum(['PUBLISHED', 'DRAFT']).optional(),
  tagIds:     z.array(z.number()).optional(),
});

const updateArticleSchema = createArticleSchema.partial();

// --- Ingrédients ---

const updateIngredientSchema = z.object({
  affiliateUrl: z.string().url('L\'URL affiliée doit être une URL valide').max(2000, 'L\'URL ne doit pas dépasser 2000 caractères').nullable().optional(),
  estimatedPricePerUnit: z.coerce.number().min(0).nullable().optional(),
  unitSize: z.coerce.number().positive().nullable().optional(),
});

// --- Techniques ---

const createTechniqueSchema = z.object({
  name:        z.string().min(1, 'Le nom est requis').max(100, 'Le nom ne doit pas dépasser 100 caractères').transform(s => s.trim()),
  description: z.string().min(1, 'La description est requise').max(5000, 'La description ne doit pas dépasser 5000 caractères').transform(s => s.trim()),
  videoUrl:    z.string().url('URL vidéo invalide').optional().nullable(),
  iconUrl:     z.string().optional().nullable(),
});

const updateTechniqueSchema = createTechniqueSchema.partial();

// --- Plan utilisateur (admin) ---

const updateUserPlanSchema = z.object({
  plan: z.enum(['FREE', 'PREMIUM'], { message: 'Le plan doit être FREE ou PREMIUM' }),
});

// --- Préférences gustatives ---

const preferencesSchema = z.object({
  sweetness:           z.number().int().min(1).max(5).optional(),
  bitterness:          z.number().int().min(1).max(5).optional(),
  sourness:            z.number().int().min(1).max(5).optional(),
  strength:            z.number().int().min(1).max(5).optional(),
  excludedIngredients: z.array(z.number().int().positive()).optional(),
});

// --- Shopping List ---

const createShoppingListSchema = z.object({
  recipeIds: z.array(z.coerce.number().int().positive()).min(1, 'Au moins une recette est requise').max(20, 'Maximum 20 recettes'),
  servingsMultiplier: z.record(z.string(), z.coerce.number().positive()).optional(),
});

// --- Tasting Log ---

const createTastingLogSchema = z.object({
  recipeId:       z.coerce.number().int().positive('recipeId est requis'),
  notes:          z.string().max(2000, 'Les notes ne doivent pas dépasser 2000 caractères').optional().nullable().transform(s => s?.trim() || null),
  photoUrl:       z.string().optional().nullable(),
  personalRating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  adjustments:    z.string().max(2000, 'Les ajustements ne doivent pas dépasser 2000 caractères').optional().nullable().transform(s => s?.trim() || null),
  madeAt:         z.string().datetime().optional(),
});

// --- Rating ---

const ratingSchema = z.object({
  score: z.coerce.number().int().min(1, 'Le score doit être compris entre 1 et 5').max(5, 'Le score doit être compris entre 1 et 5'),
});

// --- Bar virtuel ---

const updateBarSchema = z.object({
  ingredientIds: z.array(z.coerce.number().int().positive()).max(200),
});

// --- Menu cocktail ---

const generateMenuSchema = z.object({
  title:           z.string().min(1).max(200),
  recipeIds:       z.array(z.coerce.number().int().positive()).min(1).max(20),
  template:        z.enum(['classic', 'modern', 'minimal']).default('classic'),
  showIngredients: z.boolean().default(true),
});

// --- Glossaire ---

const createGlossaryEntrySchema = z.object({
  term:             z.string().min(1).max(200),
  definition:       z.string().min(1).max(2000),
  category:         z.string().min(1).max(100),
  longDescription:  z.string().max(10000).optional(),
  relatedRecipeIds: z.array(z.coerce.number().int().positive()).max(20).optional().default([]),
  relatedEntryIds:  z.array(z.coerce.number().int().positive()).max(20).optional().default([]),
});

// Helper : formatte les erreurs Zod en message lisible
const formatZodError = (error) => {
  const fieldErrors = error.flatten().fieldErrors;
  const messages = Object.values(fieldErrors).flat();
  return messages.length === 1 ? messages[0] : messages.join('. ');
};

module.exports = {
  createShoppingListSchema,
  createTastingLogSchema,
  createRecipeSchema,
  updateRecipeSchema,
  createCommentSchema,
  updateCommentSchema,
  createCollectionSchema,
  updateCollectionSchema,
  createChallengeSchema,
  updateProfileSchema,
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  verifyEmailSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  ratingSchema,
  createArticleSchema,
  updateArticleSchema,
  updateIngredientSchema,
  createTechniqueSchema,
  updateTechniqueSchema,
  updateUserPlanSchema,
  preferencesSchema,
  updateBarSchema,
  generateMenuSchema,
  createGlossaryEntrySchema,
  formatZodError,
};
