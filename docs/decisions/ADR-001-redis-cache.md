# ADR-001 : Cache Redis pour les routes GET publiques

**Date** : 2026-03-13
**Statut** : Accepté

## Contexte

L'application expose des routes GET publiques (liste des recettes, détail d'une recette, catégories) qui sont consultées fréquemment sans nécessiter de données en temps réel. Ces routes sollicitent PostgreSQL pour des jointures multi-tables (recettes + catégories + auteur + calcul de notes moyennes).

Sur un serveur Debian domestique avec ressources limitées, la charge sur PostgreSQL pourrait devenir problématique si le trafic augmente ou lors de phases de test avec gros datasets.

## Décision

Mettre en place un cache Redis via `ioredis` avec un middleware Express (`cache.js`) appliqué sur les routes GET publiques.

**Stratégie choisie : cache-aside (lazy loading)**
1. À chaque requête GET, vérifier si la clé existe dans Redis
2. Si oui (cache HIT) : renvoyer la valeur directement sans interroger PostgreSQL
3. Si non (cache MISS) : exécuter la requête Prisma, stocker le résultat dans Redis avec TTL, renvoyer la réponse

**TTL par route :**
- `GET /recipes` : 60 secondes
- `GET /recipes/:id` : 60 secondes
- `GET /categories` : 300 secondes (données rarement modifiées)

**Invalidation :**
- Toute mutation sur les recettes (POST, PUT, DELETE, PATCH) invalide les clés concernées
- Pattern d'invalidation : `DEL /recipes*` (wildcards via SCAN + DEL)

## Alternatives considérées

### Cache HTTP (Cache-Control headers)
- Avantage : aucune infrastructure supplémentaire
- Inconvénient : le cache est côté client/proxy, pas contrôlé côté serveur. Invalidation impossible immédiatement après mutation.

### Memoïzation en mémoire (node-cache, Map)
- Avantage : zéro dépendance externe
- Inconvénient : cache perdu au redémarrage, pas partageable entre plusieurs instances, pas de monitoring facilement intégrable

### PgBouncer (pooling PostgreSQL)
- Avantage : réduit les connexions PG sans couche supplémentaire
- Inconvénient : ne réduit pas le nombre de requêtes SQL, uniquement les connexions. Ne répond pas au problème de charge sur les lectures.

## Conséquences

**Positives :**
- Réduction significative de la charge PostgreSQL sur les routes populaires
- Temps de réponse plus rapide pour les utilisateurs (Redis en mémoire vs PG sur disque)
- Redis déjà présent dans la stack → base pour d'autres usages futurs (sessions, pub/sub pour notifications temps réel)

**Négatives / Risques :**
- Données potentiellement périmées pendant la durée du TTL (acceptable pour ce cas d'usage)
- Complexité d'invalidation : une mutation oubliée peut laisser du cache stale
- Dépendance supplémentaire : si Redis est indisponible, le middleware doit avoir un fallback gracieux (passer directement à PG)

**À surveiller :**
- Implémenter un fallback si `ioredis` lève une exception (try/catch autour du cache, continuer sans cache)
- Monitorer le taux de HIT/MISS pour ajuster les TTL
- Ne pas cacher les routes qui dépendent de l'utilisateur connecté (favorites, ratings utilisateur)
