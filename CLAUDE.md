# Projet Cocktails — Contexte pour Claude Code

## Description du projet
Application web de recettes de cocktails. MVP centré sur un catalogue de recettes consultable. Projet solo, lancé progressivement.

## Stack technique
- **Backend :** Node.js + Express
- **Frontend :** React
- **Base de données :** PostgreSQL + Prisma (ORM)
- **Hébergement :** Serveur Debian local (accès SSH)

## Structure du projet
```
cocktail-app/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   └── index.js
│   └── package.json
└── frontend/
    └── (React)
```

## Schéma Prisma (base de données)
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Recipe {
  id          Int                @id @default(autoincrement())
  name        String
  description String?
  imageUrl    String?
  difficulty  Difficulty
  prepTime    Int                // en minutes
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt
  categoryId  Int
  category    Category           @relation(fields: [categoryId], references: [id])
  ingredients RecipeIngredient[]
  steps       Step[]
}

model Category {
  id      Int      @id @default(autoincrement())
  name    String   @unique
  recipes Recipe[]
}

model Ingredient {
  id      Int                @id @default(autoincrement())
  name    String             @unique
  recipes RecipeIngredient[]
}

model RecipeIngredient {
  id           Int        @id @default(autoincrement())
  quantity     Float
  unit         String
  recipeId     Int
  recipe       Recipe     @relation(fields: [recipeId], references: [id])
  ingredientId Int
  ingredient   Ingredient @relation(fields: [ingredientId], references: [id])
}

model Step {
  id          Int    @id @default(autoincrement())
  order       Int
  description String
  recipeId    Int
  recipe      Recipe @relation(fields: [recipeId], references: [id])
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}
```

## Conventions de code
- JavaScript (pas TypeScript pour l'instant)
- Async/await — pas de callbacks
- Controllers séparés des routes
- Variables et fonctions en camelCase
- Fichiers en kebab-case
- Commentaires en français

## État d'avancement
- [x] Schéma de base de données défini
- [ ] Initialisation du projet backend
- [ ] Migrations Prisma
- [ ] Routes CRUD recettes
- [ ] Frontend React

## Fonctionnalités V1 (MVP)
- Catalogue de recettes consultable
- Fiche recette : nom, description, ingrédients avec quantités, étapes, difficulté, temps de préparation, catégorie
- Les recettes sont ajoutées manuellement via interface admin simple

## Fonctionnalités futures (ne pas implémenter maintenant)
- Système de notation / commentaires
- Annuaire de bars
- Feature photo → cocktails réalisables (vision AI)
- Comptes utilisateurs

## Git
- **GitHub :** https://github.com/felixhennequin-gif
- Repo du projet à créer sur GitHub
- Utiliser SSH pour le remote depuis le serveur Debian
- Projet solo — garder le code simple et lisible
- Ne pas sur-ingéniérer — MVP d'abord
- Toujours demander validation avant les actions irréversibles (suppression BDD, etc.)