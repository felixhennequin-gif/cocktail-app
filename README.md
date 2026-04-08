> 🇬🇧 **English** | [🇫🇷 Français](README.fr.md)

<p align="center">
  <img src="brand/ecume-icon.svg" alt="Écume" width="48" />
</p>

<h1 align="center">Écume API</h1>

<p align="center">
  Public REST API for cocktail recipes.<br>
  <a href="https://cocktail-app.fr">cocktail-app.fr</a> · <a href="https://cocktail-app.fr/api-docs">Interactive docs</a>
</p>

<p align="center">
  <a href="https://github.com/felixhennequin-gif/cocktail-app/actions/workflows/ci.yml"><img src="https://github.com/felixhennequin-gif/cocktail-app/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
</p>

---

## Base URL

```
https://cocktail-app.fr/api/v1
```

## Authentication

All public endpoints can be called **without authentication**. To get higher rate limits, pass an API key via the `X-API-Key` header.

```bash
curl https://cocktail-app.fr/api/v1/recipes \
  -H "X-API-Key: YOUR_API_KEY"
```

Create and manage your keys on [cocktail-app.fr/api-docs](https://cocktail-app.fr/api-docs) (login required).

## Rate limits

| Client | Limit | Window |
|--------|-------|--------|
| Anonymous (by IP) | 100 requests | 1 hour |
| With API key | 1,000 requests | 1 hour |

Rate limit headers are included in every response: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`.

## Endpoints

### Recipes

#### `GET /api/v1/recipes`

Returns a paginated list of published recipes.

| Parameter | Description |
|-----------|-------------|
| `page` | Page number (default: 1) |
| `limit` | Items per page, 1–100 (default: 20) |
| `q` | Full-text search query |
| `categoryId` | Filter by category ID |
| `tags` | Comma-separated tag names |
| `minRating` | Minimum average rating (1–5) |
| `maxTime` | Maximum preparation time in minutes |
| `difficulty` | `EASY`, `MEDIUM` or `HARD` |
| `sort` | `newest`, `oldest`, `topRated`, `timeAsc`, `timeDesc`, `popular` |

#### `GET /api/v1/recipes/:id`

Returns a single recipe with ingredients, steps, tags and rating.

| Parameter | Description |
|-----------|-------------|
| `id` | Recipe ID (integer) |

### Categories

#### `GET /api/v1/categories`

Returns all recipe categories, ordered alphabetically.

### Tags

#### `GET /api/v1/tags`

Returns all tags, ordered by number of associated recipes (descending). Includes `recipesCount`.

### Ingredients

#### `GET /api/v1/ingredients`

Returns up to 200 ingredients, ordered alphabetically.

| Parameter | Description |
|-----------|-------------|
| `q` | Optional name filter (case-insensitive substring) |

## API key management

These endpoints require JWT authentication (login to [cocktail-app.fr](https://cocktail-app.fr) first).

#### `GET /api/api-keys`

List your API keys. The key value is never returned after creation.

#### `POST /api/api-keys`

Create a new API key. Maximum 5 keys per account.

```json
{ "name": "My Discord bot" }
```

The `key` value is returned **only once** in the response.

#### `DELETE /api/api-keys/:id`

Revoke an API key. Apps using it will stop working immediately.

## Response format

All responses are JSON.

### Pagination

```json
{
  "recipes": [{ "id": 1, "name": "Mojito", "difficulty": "EASY", "..." }],
  "total": 42,
  "page": 1,
  "totalPages": 3
}
```

### Recipe detail

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
  "ingredients": [{ "quantity": 6, "unit": "cl", "ingredient": { "id": 1, "name": "White rum" } }],
  "steps": [{ "order": 1, "description": "Muddle the mint..." }],
  "tags": ["summer", "mojito"],
  "avgRating": 4.3,
  "ratingsCount": 17
}
```

### Errors

```json
{ "error": "Human-readable error message" }
```

## Code examples

### curl

```bash
# Without authentication
curl "https://cocktail-app.fr/api/v1/recipes?q=mojito&limit=5"

# With API key
curl "https://cocktail-app.fr/api/v1/recipes?sort=topRated" \
  -H "X-API-Key: YOUR_KEY_HERE"

# Single recipe
curl "https://cocktail-app.fr/api/v1/recipes/1"
```

### JavaScript

```javascript
const BASE = 'https://cocktail-app.fr/api/v1';
const API_KEY = 'YOUR_KEY_HERE';

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

// Usage
getRecipes('mojito').then(data => console.log(data.recipes));
```

### Python

```python
import requests

BASE = 'https://cocktail-app.fr/api/v1'
API_KEY = 'YOUR_KEY_HERE'
headers = {'X-API-Key': API_KEY}

# List recipes
r = requests.get(f'{BASE}/recipes', params={'q': 'mojito'}, headers=headers)
r.raise_for_status()
recipes = r.json()['recipes']

# Single recipe
r = requests.get(f'{BASE}/recipes/1', headers=headers)
r.raise_for_status()
recipe = r.json()
```

## Links

- **Website**: [cocktail-app.fr](https://cocktail-app.fr)
- **Interactive docs**: [cocktail-app.fr/api-docs](https://cocktail-app.fr/api-docs)

## License

Private project — all rights reserved.
