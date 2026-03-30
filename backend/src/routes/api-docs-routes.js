const { Router } = require('express');

const router = Router();

// GET /api/docs — page de documentation statique de l'API publique v1
router.get('/api/docs', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(buildDocsHtml());
});

// Construit le HTML de la documentation
function buildDocsHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>API Documentation — Cocktails</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0f0f14;
      --surface: #1a1a24;
      --surface2: #22222f;
      --border: #2e2e40;
      --text: #e8e8f0;
      --muted: #8888a8;
      --gold: #d4a843;
      --gold-light: #e8c46a;
      --green: #4caf7d;
      --blue: #5b9bd5;
      --red: #e05c5c;
      --orange: #d4834a;
      --code-bg: #12121a;
      --radius: 8px;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }
    a { color: var(--gold); text-decoration: none; }
    a:hover { color: var(--gold-light); text-decoration: underline; }
    .container { max-width: 900px; margin: 0 auto; padding: 2rem 1.5rem; }
    header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 2rem;
      margin-bottom: 2.5rem;
    }
    header h1 { font-size: 2rem; font-weight: 700; color: var(--gold); margin-bottom: 0.5rem; }
    header p { color: var(--muted); font-size: 1.05rem; }
    .badge {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      vertical-align: middle;
    }
    .badge-get    { background: var(--green); color: #fff; }
    .badge-post   { background: var(--blue);  color: #fff; }
    .badge-delete { background: var(--red);   color: #fff; }
    .badge-auth   { background: var(--orange); color: #fff; }
    h2 {
      font-size: 1.3rem;
      font-weight: 600;
      color: var(--gold);
      margin: 2.5rem 0 1rem;
      padding-bottom: 0.4rem;
      border-bottom: 1px solid var(--border);
    }
    h3 { font-size: 1rem; font-weight: 600; margin: 1.5rem 0 0.5rem; color: var(--text); }
    .endpoint {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      margin-bottom: 1rem;
      overflow: hidden;
    }
    .endpoint-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: var(--surface2);
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 0.9rem;
    }
    .endpoint-path { color: var(--text); font-weight: 600; }
    .endpoint-body { padding: 0.75rem 1rem; color: var(--muted); font-size: 0.9rem; }
    .endpoint-body p { margin-bottom: 0.4rem; }
    .params { margin-top: 0.5rem; }
    .param {
      display: flex;
      gap: 0.5rem;
      align-items: flex-start;
      margin-bottom: 0.25rem;
      font-size: 0.85rem;
    }
    .param-name { color: var(--gold-light); font-family: monospace; min-width: 120px; }
    .param-desc { color: var(--muted); }
    code {
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 1px 5px;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 0.85em;
      color: var(--gold-light);
    }
    pre {
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1rem 1.25rem;
      overflow-x: auto;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 0.83rem;
      line-height: 1.7;
      margin: 0.75rem 0;
    }
    .info-box {
      background: var(--surface);
      border: 1px solid var(--border);
      border-left: 4px solid var(--gold);
      border-radius: var(--radius);
      padding: 1rem 1.25rem;
      margin: 1rem 0;
      font-size: 0.92rem;
      color: var(--muted);
    }
    .info-box strong { color: var(--text); }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
      margin: 0.75rem 0;
    }
    th {
      text-align: left;
      padding: 0.5rem 0.75rem;
      background: var(--surface2);
      color: var(--muted);
      font-weight: 600;
      border-bottom: 1px solid var(--border);
    }
    td {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--border);
      color: var(--muted);
    }
    td:first-child { color: var(--gold-light); font-family: monospace; }
    footer {
      margin-top: 4rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
      color: var(--muted);
      font-size: 0.85rem;
      text-align: center;
    }
  </style>
</head>
<body>
<div class="container">
  <header>
    <h1>Cocktails API</h1>
    <p>Public read-only API &mdash; version 1. Base URL: <code>https://cocktail-app.fr/api/v1</code></p>
  </header>

  <h2>Authentication</h2>
  <div class="info-box">
    <p><strong>Without a key:</strong> 100 requests / hour per IP address.</p>
    <p><strong>With an API key:</strong> 1,000 requests / hour. Pass your key in the <code>X-API-Key</code> header.</p>
    <p style="margin-top:0.5rem">Create and manage your keys at <a href="/api-docs">/api-docs</a> (login required).</p>
  </div>
  <pre>curl https://cocktail-app.fr/api/v1/recipes \\
  -H "X-API-Key: YOUR_API_KEY"</pre>

  <h2>Rate limiting</h2>
  <table>
    <tr><th>Client</th><th>Limit</th><th>Window</th></tr>
    <tr><td>Anonymous (by IP)</td><td>100 requests</td><td>1 hour</td></tr>
    <tr><td>With API key</td><td>1,000 requests</td><td>1 hour</td></tr>
  </table>
  <p style="font-size:0.85rem;color:var(--muted);margin-top:0.5rem">
    Rate limit headers: <code>RateLimit-Limit</code>, <code>RateLimit-Remaining</code>, <code>RateLimit-Reset</code>
  </p>

  <h2>Endpoints</h2>

  <div class="endpoint">
    <div class="endpoint-header">
      <span class="badge badge-get">GET</span>
      <span class="endpoint-path">/api/v1/recipes</span>
    </div>
    <div class="endpoint-body">
      <p>Returns a paginated list of published recipes.</p>
      <div class="params">
        <div class="param"><span class="param-name">page</span><span class="param-desc">Page number (default: 1)</span></div>
        <div class="param"><span class="param-name">limit</span><span class="param-desc">Items per page, 1–100 (default: 20)</span></div>
        <div class="param"><span class="param-name">q</span><span class="param-desc">Full-text search query</span></div>
        <div class="param"><span class="param-name">categoryId</span><span class="param-desc">Filter by category ID</span></div>
        <div class="param"><span class="param-name">tags</span><span class="param-desc">Comma-separated tag names</span></div>
        <div class="param"><span class="param-name">minRating</span><span class="param-desc">Minimum average rating (1–5)</span></div>
        <div class="param"><span class="param-name">maxTime</span><span class="param-desc">Maximum preparation time in minutes</span></div>
        <div class="param"><span class="param-name">difficulty</span><span class="param-desc">EASY, MEDIUM or HARD</span></div>
        <div class="param"><span class="param-name">sort</span><span class="param-desc">newest, oldest, topRated, timeAsc, timeDesc, popular</span></div>
      </div>
    </div>
  </div>

  <div class="endpoint">
    <div class="endpoint-header">
      <span class="badge badge-get">GET</span>
      <span class="endpoint-path">/api/v1/recipes/:id</span>
    </div>
    <div class="endpoint-body">
      <p>Returns a single recipe with ingredients, steps, tags and rating.</p>
      <div class="params">
        <div class="param"><span class="param-name">id</span><span class="param-desc">Recipe ID (integer)</span></div>
      </div>
    </div>
  </div>

  <div class="endpoint">
    <div class="endpoint-header">
      <span class="badge badge-get">GET</span>
      <span class="endpoint-path">/api/v1/categories</span>
    </div>
    <div class="endpoint-body">
      <p>Returns all recipe categories, ordered alphabetically.</p>
    </div>
  </div>

  <div class="endpoint">
    <div class="endpoint-header">
      <span class="badge badge-get">GET</span>
      <span class="endpoint-path">/api/v1/tags</span>
    </div>
    <div class="endpoint-body">
      <p>Returns all tags, ordered by number of associated recipes (descending). Includes <code>recipesCount</code>.</p>
    </div>
  </div>

  <div class="endpoint">
    <div class="endpoint-header">
      <span class="badge badge-get">GET</span>
      <span class="endpoint-path">/api/v1/ingredients</span>
    </div>
    <div class="endpoint-body">
      <p>Returns up to 200 ingredients, ordered alphabetically.</p>
      <div class="params">
        <div class="param"><span class="param-name">q</span><span class="param-desc">Optional name filter (case-insensitive substring)</span></div>
      </div>
    </div>
  </div>

  <h2>API key management</h2>

  <div class="endpoint">
    <div class="endpoint-header">
      <span class="badge badge-get">GET</span>
      <span class="endpoint-path">/api/api-keys</span>
      <span class="badge badge-auth">JWT auth</span>
    </div>
    <div class="endpoint-body">
      <p>List your API keys (key value is never returned after creation).</p>
    </div>
  </div>

  <div class="endpoint">
    <div class="endpoint-header">
      <span class="badge badge-post">POST</span>
      <span class="endpoint-path">/api/api-keys</span>
      <span class="badge badge-auth">JWT auth</span>
    </div>
    <div class="endpoint-body">
      <p>Create a new API key. Maximum 5 keys per account.</p>
      <p>Body: <code>{ "name": "My Discord bot" }</code></p>
      <p>The <code>key</code> value is returned only once in the response.</p>
    </div>
  </div>

  <div class="endpoint">
    <div class="endpoint-header">
      <span class="badge badge-delete">DELETE</span>
      <span class="endpoint-path">/api/api-keys/:id</span>
      <span class="badge badge-auth">JWT auth</span>
    </div>
    <div class="endpoint-body">
      <p>Revoke an API key. Apps using it will stop working immediately.</p>
    </div>
  </div>

  <h2>Response format</h2>
  <p style="color:var(--muted);font-size:0.9rem;margin-bottom:0.75rem">All responses are JSON. Errors follow a consistent shape:</p>
  <pre>{ "error": "Human-readable error message" }</pre>

  <h3>Recipe list response</h3>
  <pre>{
  "recipes": [ { "id": 1, "name": "Mojito", "difficulty": "EASY", ... } ],
  "total": 42,
  "page": 1,
  "totalPages": 3
}</pre>

  <h3>Recipe detail response</h3>
  <pre>{
  "id": 1,
  "name": "Mojito",
  "description": "...",
  "imageUrl": "/uploads/mojito.jpg",
  "difficulty": "EASY",
  "prepTime": 5,
  "servings": 1,
  "status": "PUBLISHED",
  "category": { "id": 2, "name": "Long drinks" },
  "ingredients": [ { "quantity": 6, "unit": "cl", "ingredient": { "id": 1, "name": "White rum" } } ],
  "steps": [ { "order": 1, "description": "Muddle the mint..." } ],
  "tags": [ "summer", "mojito" ],
  "avgRating": 4.3,
  "ratingsCount": 17
}</pre>

  <h2>Code examples</h2>

  <h3>curl</h3>
  <pre>## Without authentication
curl "https://cocktail-app.fr/api/v1/recipes?q=mojito&amp;limit=5"

## With API key
curl "https://cocktail-app.fr/api/v1/recipes?sort=topRated" \\
  -H "X-API-Key: YOUR_KEY_HERE"

## Single recipe
curl "https://cocktail-app.fr/api/v1/recipes/1"</pre>

  <h3>JavaScript (fetch)</h3>
  <pre>const BASE = 'https://cocktail-app.fr/api/v1';
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
  const res = await fetch(\`\${BASE}/recipes/\${id}\`, {
    headers: { 'X-API-Key': API_KEY }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Exemple d'utilisation
getRecipes('mojito').then(data => console.log(data.recipes));</pre>

  <h3>Python</h3>
  <pre>import requests

BASE = 'https://cocktail-app.fr/api/v1'
API_KEY = 'YOUR_KEY_HERE'
headers = {'X-API-Key': API_KEY}

# Liste des recettes
r = requests.get(f'{BASE}/recipes', params={'q': 'mojito'}, headers=headers)
r.raise_for_status()
recipes = r.json()['recipes']

# Détail d'une recette
r = requests.get(f'{BASE}/recipes/1', headers=headers)
r.raise_for_status()
recipe = r.json()</pre>

  <footer>
    Cocktails API &mdash; <a href="https://cocktail-app.fr">cocktail-app.fr</a>
  </footer>
</div>
</body>
</html>`;
}

module.exports = router;
