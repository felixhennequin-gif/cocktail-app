> [🇬🇧 English](README.md) | 🇫🇷 **Français**

<p align="center">
  <img src="brand/ecume-icon.svg" alt="Écume" width="48" />
</p>

<h1 align="center">Écume API</h1>

<p align="center">
  API REST publique pour les recettes de cocktails.<br>
  <a href="https://cocktail-app.fr">cocktail-app.fr</a> · <a href="https://cocktail-app.fr/api-docs">Documentation interactive</a>
</p>

<p align="center">
  <a href="https://github.com/felixhennequin-gif/cocktail-app/actions/workflows/ci.yml"><img src="https://github.com/felixhennequin-gif/cocktail-app/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
</p>

---

## URL de base

```
https://cocktail-app.fr/api/v1
```

## Authentification

Tous les endpoints publics sont accessibles **sans authentification**. Pour bénéficier de limites plus élevées, passez une clé API via le header `X-API-Key`.

```bash
curl https://cocktail-app.fr/api/v1/recipes \
  -H "X-API-Key: VOTRE_CLE_API"
```

Créez et gérez vos clés sur [cocktail-app.fr/api-docs](https://cocktail-app.fr/api-docs) (connexion requise).

## Limites de requêtes

| Client | Limite | Fenêtre |
|--------|--------|---------|
| Anonyme (par IP) | 100 requêtes | 1 heure |
| Avec clé API | 1 000 requêtes | 1 heure |

Les headers de limite sont inclus dans chaque réponse : `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`.

## Endpoints

### Recettes

#### `GET /api/v1/recipes`

Retourne une liste paginée des recettes publiées.

| Paramètre | Description |
|-----------|-------------|
| `page` | Numéro de page (défaut : 1) |
| `limit` | Éléments par page, 1–100 (défaut : 20) |
| `q` | Recherche full-text |
| `categoryId` | Filtrer par ID de catégorie |
| `tags` | Noms de tags séparés par des virgules |
| `minRating` | Note moyenne minimum (1–5) |
| `maxTime` | Temps de préparation maximum en minutes |
| `difficulty` | `EASY`, `MEDIUM` ou `HARD` |
| `sort` | `newest`, `oldest`, `topRated`, `timeAsc`, `timeDesc`, `popular` |

#### `GET /api/v1/recipes/:id`

Retourne une recette avec ses ingrédients, étapes, tags et note moyenne.

| Paramètre | Description |
|-----------|-------------|
| `id` | ID de la recette (entier) |

### Catégories

#### `GET /api/v1/categories`

Retourne toutes les catégories de recettes, triées par ordre alphabétique.

### Tags

#### `GET /api/v1/tags`

Retourne tous les tags, triés par nombre de recettes associées (décroissant). Inclut `recipesCount`.

### Ingrédients

#### `GET /api/v1/ingredients`

Retourne jusqu'à 200 ingrédients, triés par ordre alphabétique.

| Paramètre | Description |
|-----------|-------------|
| `q` | Filtre optionnel par nom (sous-chaîne, insensible à la casse) |

## Gestion des clés API

Ces endpoints nécessitent une authentification JWT (connectez-vous sur [cocktail-app.fr](https://cocktail-app.fr) au préalable).

#### `GET /api/api-keys`

Liste vos clés API. La valeur de la clé n'est jamais renvoyée après la création.

#### `POST /api/api-keys`

Crée une nouvelle clé API. Maximum 5 clés par compte.

```json
{ "name": "Mon bot Discord" }
```

La valeur de la `key` est renvoyée **une seule fois** dans la réponse.

#### `DELETE /api/api-keys/:id`

Révoque une clé API. Les applications qui l'utilisent cesseront de fonctionner immédiatement.

## Format des réponses

Toutes les réponses sont en JSON.

### Pagination

```json
{
  "recipes": [{ "id": 1, "name": "Mojito", "difficulty": "EASY", "..." }],
  "total": 42,
  "page": 1,
  "totalPages": 3
}
```

### Détail d'une recette

```json
{
  "id": 1,
  "name": "Mojito",
  "description": "...",
  "imageUrl": "/uploads/mojito.jpg",
  "difficulty": "EASY",
  "prepTime": 5,
  "servings": 1,
  "status": "PUBLISHED",
  "category": { "id": 2, "name": "Long drinks" },
  "ingredients": [{ "quantity": 6, "unit": "cl", "ingredient": { "id": 1, "name": "Rhum blanc" } }],
  "steps": [{ "order": 1, "description": "Piler la menthe..." }],
  "tags": ["summer", "mojito"],
  "avgRating": 4.3,
  "ratingsCount": 17
}
```

### Erreurs

```json
{ "error": "Message d'erreur lisible" }
```

## Exemples de code

### curl

```bash
# Sans authentification
curl "https://cocktail-app.fr/api/v1/recipes?q=mojito&limit=5"

# Avec clé API
curl "https://cocktail-app.fr/api/v1/recipes?sort=topRated" \
  -H "X-API-Key: VOTRE_CLE"

# Une recette
curl "https://cocktail-app.fr/api/v1/recipes/1"
```

### JavaScript

```javascript
const BASE = 'https://cocktail-app.fr/api/v1';
const API_KEY = 'VOTRE_CLE';

async function getRecipes(query = '') {
  const url = new URL(BASE + '/recipes');
  if (query) url.searchParams.set('q', query);
  const res = await fetch(url, {
    headers: { 'X-API-Key': API_KEY }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function getRecipe(id) {
  const res = await fetch(`${BASE}/recipes/${id}`, {
    headers: { 'X-API-Key': API_KEY }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Utilisation
getRecipes('mojito').then(data => console.log(data.recipes));
```

### Python

```python
import requests

BASE = 'https://cocktail-app.fr/api/v1'
API_KEY = 'VOTRE_CLE'
headers = {'X-API-Key': API_KEY}

# Lister les recettes
r = requests.get(f'{BASE}/recipes', params={'q': 'mojito'}, headers=headers)
r.raise_for_status()
recipes = r.json()['recipes']

# Détail d'une recette
r = requests.get(f'{BASE}/recipes/1', headers=headers)
r.raise_for_status()
recipe = r.json()
```

## Liens

- **Site web** : [cocktail-app.fr](https://cocktail-app.fr)
- **Documentation interactive** : [cocktail-app.fr/api-docs](https://cocktail-app.fr/api-docs)

## Licence

Projet privé — tous droits réservés.
