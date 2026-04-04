const {
  registerSchema,
  createRecipeSchema,
  createCommentSchema,
  createCollectionSchema,
  createTastingLogSchema,
  createShoppingListSchema,
  generateMenuSchema,
  createGlossaryEntrySchema,
  changePasswordSchema,
  formatZodError,
} = require('../src/schemas');

describe('Zod Validation Schemas', () => {

  // --- registerSchema ---
  describe('registerSchema', () => {
    it('accepte un register valide', () => {
      const result = registerSchema.safeParse({
        email: 'test@test.com',
        pseudo: 'alice',
        password: 'securePass1',
      });
      expect(result.success).toBe(true);
    });

    it('rejette un email invalide', () => {
      const result = registerSchema.safeParse({
        email: 'not-an-email',
        pseudo: 'alice',
        password: 'securePass1',
      });
      expect(result.success).toBe(false);
    });

    it('rejette un mot de passe sans chiffre', () => {
      const result = registerSchema.safeParse({
        email: 'test@test.com',
        pseudo: 'alice',
        password: 'noDigitsHere',
      });
      expect(result.success).toBe(false);
    });

    it('rejette un mot de passe sans lettre', () => {
      const result = registerSchema.safeParse({
        email: 'test@test.com',
        pseudo: 'alice',
        password: '12345678',
      });
      expect(result.success).toBe(false);
    });

    it('rejette un mot de passe trop court', () => {
      const result = registerSchema.safeParse({
        email: 'test@test.com',
        pseudo: 'alice',
        password: 'Ab1',
      });
      expect(result.success).toBe(false);
    });

    it('rejette un pseudo vide', () => {
      const result = registerSchema.safeParse({
        email: 'test@test.com',
        pseudo: '',
        password: 'securePass1',
      });
      expect(result.success).toBe(false);
    });
  });

  // --- createRecipeSchema ---
  describe('createRecipeSchema', () => {
    const validRecipe = {
      name: 'Mojito',
      difficulty: 'EASY',
      prepTime: 10,
      categoryId: 1,
    };

    it('accepte une recette minimale valide', () => {
      const result = createRecipeSchema.safeParse(validRecipe);
      expect(result.success).toBe(true);
    });

    it('rejette une difficulté invalide', () => {
      const result = createRecipeSchema.safeParse({
        ...validRecipe,
        difficulty: 'IMPOSSIBLE',
      });
      expect(result.success).toBe(false);
    });

    it('rejette un nom vide', () => {
      const result = createRecipeSchema.safeParse({
        ...validRecipe,
        name: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejette un prepTime négatif', () => {
      const result = createRecipeSchema.safeParse({
        ...validRecipe,
        prepTime: -5,
      });
      expect(result.success).toBe(false);
    });

    it('accepte une saison valide', () => {
      const result = createRecipeSchema.safeParse({
        ...validRecipe,
        season: 'summer',
      });
      expect(result.success).toBe(true);
    });

    it('rejette une saison invalide', () => {
      const result = createRecipeSchema.safeParse({
        ...validRecipe,
        season: 'solstice',
      });
      expect(result.success).toBe(false);
    });
  });

  // --- createCommentSchema ---
  describe('createCommentSchema', () => {
    it('accepte un commentaire valide', () => {
      const result = createCommentSchema.safeParse({ content: 'Super !', score: 4 });
      expect(result.success).toBe(true);
    });

    it('rejette un score hors limites', () => {
      const r1 = createCommentSchema.safeParse({ content: 'Bof', score: 0 });
      const r2 = createCommentSchema.safeParse({ content: 'Bof', score: 6 });
      expect(r1.success).toBe(false);
      expect(r2.success).toBe(false);
    });

    it('rejette un contenu vide (après trim)', () => {
      const result = createCommentSchema.safeParse({ content: '   ', score: 3 });
      expect(result.success).toBe(false);
    });
  });

  // --- createCollectionSchema ---
  describe('createCollectionSchema', () => {
    it('accepte une collection valide', () => {
      const result = createCollectionSchema.safeParse({ name: 'Mes favoris' });
      expect(result.success).toBe(true);
      expect(result.data.isPublic).toBe(true);
    });

    it('rejette un nom trop long', () => {
      const result = createCollectionSchema.safeParse({ name: 'A'.repeat(101) });
      expect(result.success).toBe(false);
    });
  });

  // --- createTastingLogSchema ---
  describe('createTastingLogSchema', () => {
    it('accepte un tasting valide', () => {
      const result = createTastingLogSchema.safeParse({
        recipeId: 1,
        notes: 'Délicieux',
        personalRating: 5,
      });
      expect(result.success).toBe(true);
    });

    it('rejette un recipeId manquant', () => {
      const result = createTastingLogSchema.safeParse({ notes: 'Test' });
      expect(result.success).toBe(false);
    });

    it('rejette un personalRating hors limites', () => {
      const result = createTastingLogSchema.safeParse({ recipeId: 1, personalRating: 10 });
      expect(result.success).toBe(false);
    });
  });

  // --- createShoppingListSchema ---
  describe('createShoppingListSchema', () => {
    it('accepte une liste valide', () => {
      const result = createShoppingListSchema.safeParse({ recipeIds: [1, 2, 3] });
      expect(result.success).toBe(true);
    });

    it('rejette une liste vide', () => {
      const result = createShoppingListSchema.safeParse({ recipeIds: [] });
      expect(result.success).toBe(false);
    });

    it('rejette plus de 20 recettes', () => {
      const ids = Array.from({ length: 21 }, (_, i) => i + 1);
      const result = createShoppingListSchema.safeParse({ recipeIds: ids });
      expect(result.success).toBe(false);
    });
  });

  // --- generateMenuSchema ---
  describe('generateMenuSchema', () => {
    it('accepte un menu valide', () => {
      const result = generateMenuSchema.safeParse({
        title: 'Menu Soirée',
        recipeIds: [1, 2],
      });
      expect(result.success).toBe(true);
      expect(result.data.template).toBe('classic');
    });

    it('rejette un template invalide', () => {
      const result = generateMenuSchema.safeParse({
        title: 'Test',
        recipeIds: [1],
        template: 'fancy',
      });
      expect(result.success).toBe(false);
    });
  });

  // --- createGlossaryEntrySchema ---
  describe('createGlossaryEntrySchema', () => {
    it('accepte une entrée valide', () => {
      const result = createGlossaryEntrySchema.safeParse({
        term: 'Shaker',
        definition: 'Ustensile pour mélanger les cocktails',
        category: 'Ustensiles',
      });
      expect(result.success).toBe(true);
    });

    it('rejette un term vide', () => {
      const result = createGlossaryEntrySchema.safeParse({
        term: '',
        definition: 'Def',
        category: 'Cat',
      });
      expect(result.success).toBe(false);
    });
  });

  // --- changePasswordSchema ---
  describe('changePasswordSchema', () => {
    it('accepte un changement valide', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'oldPass1',
        newPassword: 'newPass1',
      });
      expect(result.success).toBe(true);
    });

    it('rejette un nouveau mot de passe faible', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'oldPass1',
        newPassword: 'short',
      });
      expect(result.success).toBe(false);
    });
  });

  // --- formatZodError ---
  describe('formatZodError', () => {
    it('formatte une seule erreur', () => {
      const result = registerSchema.safeParse({ email: 'bad', pseudo: 'a', password: '1' });
      expect(result.success).toBe(false);
      const msg = formatZodError(result.error);
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(0);
    });
  });
});
