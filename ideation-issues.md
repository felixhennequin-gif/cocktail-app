# Écume — Ideation Issues (Mars 2026)

---

### Journal de dégustation personnel

**Labels**: `feature`, `frontend`, `backend`, `database`, `product:ux`
**Priority**: 🟠 High
**File(s)**: `—`

**Problem**:
L'utilisateur peut noter et commenter une recette, mais ne peut pas tenir un journal personnel de ses dégustations : quand il a préparé un cocktail, ses impressions, ses ajustements, des photos de sa réalisation. Il n'y a pas de notion de "j'ai fait ce cocktail".

**Why it's a problem**:
Le journal de dégustation transforme l'app d'un catalogue consultatif en un compagnon d'expérience personnel. C'est le mécanisme de rétention #1 chez Vivino et Untappd — l'utilisateur revient pour enrichir son historique et voir sa progression. Sans ça, l'engagement plafonne après la phase de découverte.

**Proposed solution**:
- Nouveau modèle Prisma `TastingLog` : `id`, `userId Int`, `recipeId Int`, `notes String?`, `photoUrl String?`, `personalRating Int?` (1-5, distinct de la note publique), `adjustments String?` (modifications perso), `madeAt DateTime @default(now())`, `createdAt`, `@@index([userId, madeAt])`
- Endpoints : `POST /tastings` [auth] `{ recipeId, notes?, photoUrl?, personalRating?, adjustments? }`, `GET /tastings` [auth] (paginé, trié par date), `GET /tastings/stats` [auth] (nombre total, recette la plus faite, mois le plus actif), `DELETE /tastings/:id` [auth]
- Bouton "J'ai fait ce cocktail" sur RecipeDetail → modale avec champs notes + photo + note perso
- Page `/my-tastings` : timeline verticale chronologique avec photos et notes
- Intégration badges : "Premier cocktail réalisé", "10 cocktails réalisés", "50 cocktails", "A réalisé un cocktail de chaque catégorie"
- Complexité : L

---

### Roulette à cocktails avec filtres

**Labels**: `feature`, `frontend`, `product:ux`
**Priority**: 🟠 High
**File(s)**: `—`

**Problem**:
Quand l'utilisateur ne sait pas quoi préparer, il doit parcourir le catalogue manuellement. Le cocktail du jour est une seule suggestion passive. Il n'y a pas de mécanisme fun de découverte aléatoire.

**Why it's a problem**:
L'indécision est le frein #1 à l'utilisation d'une app de recettes. Une roulette interactive crée un moment ludique et réduit la friction de choix. C'est aussi un outil social parfait en soirée ("on tourne la roue !").

**Proposed solution**:
- Composant `CocktailRoulette.jsx` : roue animée (CSS transform + transition) avec 8-12 segments
- Filtres optionnels avant de tourner : difficulté, catégorie, "uniquement avec mon bar", saison, avec/sans alcool
- Endpoint existant `GET /recipes?limit=12&sort=random` suffit (ajouter `sort=random` au controller si pas déjà fait — `ORDER BY RANDOM()` PostgreSQL)
- Animation : rotation CSS 3-5 secondes avec easing, reveal progressif du résultat
- Bouton "Tourner à nouveau" + "Voir la recette"
- Intégrable dans la LandingPage comme CTA ou accessible via `/roulette`
- Mode soirée compatible : grande roue, gros texte
- Zéro dépendance externe — CSS animations + Canvas ou SVG
- Complexité : M

---

### Liste de courses multi-recettes

**Labels**: `feature`, `frontend`, `backend`, `product:ux`
**Priority**: 🟠 High
**File(s)**: `—`

**Problem**:
L'utilisateur qui veut préparer 3-4 cocktails pour une soirée doit noter les ingrédients de chaque recette séparément. Pas de liste de courses consolidée qui fusionne les ingrédients communs et soustrait ceux du bar virtuel.

**Why it's a problem**:
La préparation d'une soirée cocktail est le use case à plus forte valeur. Sans liste de courses, l'utilisateur doit jongler entre plusieurs onglets ou noter sur papier. Les apps concurrentes (Mealime, Paprika) ont toutes cette feature.

**Proposed solution**:
- Endpoint `POST /shopping-list` [auth] `{ recipeIds: [1,2,3], servingsMultiplier?: { "1": 2, "3": 4 } }` → retourne la liste consolidée d'ingrédients avec quantités additionnées, unités normalisées, et ingrédients du bar virtuel marqués "déjà en stock"
- Logique : fusionner les ingrédients par `ingredientId`, additionner les quantités (conversion d'unités si même famille : cl/ml), marquer `inStock: true` si dans UserIngredient
- Bouton "Ajouter à ma liste de courses" sur RecipeDetail et RecipeCard
- Page `/shopping-list` : liste à cocher (état local, localStorage), regroupée par type d'ingrédient, bouton "Partager" (copie texte ou Web Share API)
- Bouton "Tout acheter" → ouvre les liens affiliés des ingrédients manquants (si affiliateUrl renseigné)
- Complexité : M

---

### Suggestions de substitution d'ingrédients

**Labels**: `feature`, `frontend`, `backend`, `database`, `product:ux`
**Priority**: 🟡 Medium
**File(s)**: `—`

**Problem**:
Quand un ingrédient manque dans une recette, l'utilisateur est bloqué. L'app ne propose pas d'alternative ("pas de Campari ? Essayez de l'Aperol"). Le bar virtuel dit "il vous manque X" mais ne dit pas "vous pouvez remplacer par Y".

**Why it's a problem**:
La substitution est un savoir de barman qui n'est pas intuitif pour les débutants. Proposer des alternatives transforme un "je ne peux pas faire cette recette" en "je peux l'adapter". Ça augmente le nombre de recettes réalisables et réduit la frustration.

**Proposed solution**:
- Nouveau modèle Prisma `IngredientSubstitution` : `id`, `ingredientId Int`, `substituteId Int`, `ratio Float @default(1.0)` (facteur de conversion de quantité), `notes String?` (ex: "plus sucré, réduire la quantité"), `@@unique([ingredientId, substituteId])`
- Seed initial : 30-50 substitutions courantes (vodka↔gin, Campari↔Aperol, citron vert↔citron jaune, sirop de sucre↔miel, triple sec↔Cointreau↔Grand Marnier, etc.)
- Endpoint `GET /ingredients/:id/substitutes` : retourne les substituts avec notes et ratio
- Sur RecipeDetail, icône info à côté de chaque ingrédient manquant → popup "Substituts possibles" avec les alternatives disponibles dans le bar de l'utilisateur mises en avant
- Endpoint enrichi `GET /bar/makeable` : calcule aussi les recettes faisables avec substitutions (flag `withSubstitutions: true`)
- Complexité : M

---

### Calendrier de l'avent cocktails

**Labels**: `feature`, `frontend`, `backend`, `product:ux`
**Priority**: 🟡 Medium
**File(s)**: `—`

**Problem**:
Décembre est un mois fort pour les cocktails (fêtes, soirées). L'app n'exploite pas cette saisonnalité avec un mécanisme de rendez-vous quotidien ludique.

**Why it's a problem**:
Le calendrier de l'avent crée 24 raisons de revenir en décembre. C'est un format universellement compris, viral (partage du cocktail du jour sur les réseaux), et qui génère de l'anticipation. C'est aussi du contenu SEO saisonnier ("calendrier avent cocktails 2026").

**Proposed solution**:
- Endpoint `GET /recipes/advent/:day` : retourne une recette pour le jour donné (1-24), déterministe via `SHA-256("advent-{year}-{day}")` modulo recettes publiées, filtrées sur le tag "fêtes" ou "hiver" si disponible
- Sélection curatée optionnelle : table `AdventCalendar` avec `year Int`, `day Int`, `recipeId Int`, `@@unique([year, day])` — si une entrée existe, elle prime sur l'algorithme
- Page `/advent` : grille 4x6 de cases numérotées, cases futures grisées/verrouillées, case du jour mise en avant avec animation, cases passées cliquables avec vignette de la recette
- Disponible uniquement du 1er au 31 décembre (redirection vers LandingPage sinon, avec message "Rendez-vous en décembre !")
- Badge "Collectionneur de l'avent" : avoir ouvert les 24 cases
- Push notification quotidienne en décembre : "Case n°X du calendrier de l'avent est ouverte !"
- Complexité : M

---

### Système de streaks (séries d'activité)

**Labels**: `feature`, `frontend`, `backend`, `database`, `product:ux`
**Priority**: 🟡 Medium
**File(s)**: `—`

**Problem**:
Les badges récompensent des seuils cumulatifs, mais il n'y a pas de mécanisme de série quotidienne/hebdomadaire qui pousse l'utilisateur à revenir régulièrement. Pas de "streak" comme Duolingo ou Snapchat.

**Why it's a problem**:
Les streaks sont le mécanisme de rétention le plus puissant du mobile. La peur de perdre sa série est un motivateur plus fort que la récompense du badge. Duolingo attribue 50% de sa rétention aux streaks.

**Proposed solution**:
- Nouveau modèle Prisma `UserStreak` : `userId Int @unique`, `currentStreak Int @default(0)`, `longestStreak Int @default(0)`, `lastActiveDate DateTime?`, `streakFreezeAvailable Int @default(1)` (pour les premium)
- Action qualifiante = au moins une action significative par jour : noter, commenter, ajouter un favori, enregistrer une dégustation, ou soumettre une recette
- Service `streak-service.js` : vérifié à chaque action qualifiante, incrémente si `lastActiveDate` = hier, reset si > 1 jour, freeze si premium et freeze disponible
- Affichage : compteur de flamme dans le header (à côté du pseudo), section streak sur le profil
- Badges liés : "7 jours consécutifs", "30 jours", "100 jours", "365 jours"
- Push notification : "Votre série de {n} jours est en danger ! Connectez-vous aujourd'hui"
- Feature premium : 1 streak freeze par semaine (la série n'est pas cassée si un jour est manqué)
- Complexité : M

---

### Comparaison de cocktails côte à côte

**Labels**: `feature`, `frontend`, `product:ux`
**Priority**: 🟢 Low
**File(s)**: `—`

**Problem**:
Impossible de comparer deux cocktails similaires (ex: Margarita vs Daiquiri) pour choisir lequel préparer. L'utilisateur doit ouvrir deux onglets et les comparer mentalement.

**Why it's a problem**:
La comparaison est un besoin naturel dans la prise de décision. Les sites e-commerce l'ont tous. Pour les cocktails, c'est utile pour les débutants qui hésitent entre deux recettes similaires et pour les variantes.

**Proposed solution**:
- Page `/compare?ids=1,2` : vue split-screen avec deux RecipeDetail simplifiés
- Différences mises en surbrillance : ingrédients en commun (vert), uniques à chaque recette (orange), différences de quantité
- Métriques comparées : difficulté, temps de préparation, note moyenne, nombre de favoris
- Bouton "Comparer" sur RecipeCard (ajoute à un "panier de comparaison" en localStorage, max 2)
- Icône de comparaison dans la barre d'outils de RecipeDetail
- Données : réutilise les endpoints existants `GET /recipes/:id` (deux appels parallèles)
- Responsive : en colonne sur mobile (scroll vertical), côte à côte sur desktop
- Complexité : M

---

### Générateur de recettes par IA

**Labels**: `feature`, `frontend`, `backend`, `product:tech`
**Priority**: 🟠 High
**File(s)**: `—`

**Problem**:
L'utilisateur avec des ingrédients inhabituels ou un profil de goût spécifique ne trouve pas toujours une recette qui correspond dans le catalogue. Il n'y a pas de moyen de générer une recette originale adaptée à ses contraintes.

**Why it's a problem**:
L'IA générative est la fonctionnalité la plus attendue sur les apps de recettes en 2026. Proposer "Invente-moi un cocktail avec ce que j'ai" est un différentiateur majeur et un argument marketing fort. C'est aussi un puissant moteur de contenu UGC si les recettes générées peuvent être sauvegardées.

**Proposed solution**:
- Endpoint `POST /recipes/generate` [auth, premium] `{ ingredients?: [ids], tasteProfile?: { sweet, bitter, sour, strong }, style?: "classique/tropical/tiki/moderne", constraints?: "sans alcool/faible en sucre" }`
- Backend : appel API Claude (`@anthropic-ai/sdk`) avec un prompt structuré contenant les ingrédients disponibles, le profil de goût et les contraintes. Retour JSON parsé : nom, description, ingrédients avec quantités, étapes, difficulté estimée
- Rate limit : 5 générations/jour pour premium, 1/jour pour free (ou 0 pour free)
- Réponse streamée (SSE) pour afficher la recette au fur et à mesure
- Bouton "Sauvegarder comme brouillon" → crée une Recipe en status DRAFT avec `authorId` de l'user, tag auto "ia-generated"
- Page `/generate` : formulaire avec sélection d'ingrédients (autocomplete depuis le bar virtuel), curseurs de goût, bouton "Générer"
- Disclaimer visible : "Recette générée par IA — à tester et ajuster"
- Coût API : ~$0.01-0.03 par génération (Claude Haiku), marginal pour un usage limité
- Complexité : L

---

### Reconnaissance de cocktails par photo

**Labels**: `feature`, `frontend`, `backend`, `product:tech`
**Priority**: 🟡 Medium
**File(s)**: `—`

**Problem**:
L'utilisateur voit un cocktail dans un bar ou sur Instagram et veut savoir ce que c'est. Il n'a aucun moyen de le rechercher visuellement. La recherche textuelle ne fonctionne que si on connaît le nom.

**Why it's a problem**:
La recherche visuelle est le mode d'interaction le plus naturel dans un contexte social (bar, restaurant, soirée). C'est aussi un moment d'acquisition : l'utilisateur télécharge l'app pour identifier un cocktail qu'il voit. Google Lens et Vivino ont démontré le potentiel.

**Proposed solution**:
- Endpoint `POST /recipes/identify` [auth] : reçoit une image (multipart/form-data), l'envoie à l'API Claude Vision pour identification
- Prompt structuré : "Identifie ce cocktail. Retourne le nom probable, 2-3 alternatives possibles, et les indices visuels (couleur, garniture, verre) qui t'ont guidé."
- Backend : recherche le nom retourné par l'IA dans la BDD (`WHERE name ILIKE '%{nom}%'`), retourne les correspondances
- Si match trouvé → lien vers la fiche RecipeDetail
- Si pas de match → suggestion de recettes similaires par catégorie/tags
- Page `/identify` : bouton "Prendre une photo" (accès caméra via `<input type="file" capture="environment">`) ou upload depuis la galerie
- Affichage du résultat : image uploadée + nom identifié + confiance + lien recette
- Rate limit : 3/jour free, 10/jour premium
- Complexité : M

---

### Notifications temps réel via WebSocket

**Labels**: `feature`, `frontend`, `backend`, `infra`, `product:tech`
**Priority**: 🟢 Low
**File(s)**: `—`

**Problem**:
Les notifications sont récupérées par polling (le frontend interroge `/notifications` périodiquement). Le délai entre l'événement et l'affichage peut être de plusieurs secondes/minutes, et le polling génère des requêtes inutiles.

**Why it's a problem**:
Le polling est inefficace en bande passante et en latence. Pour une app sociale (follow, commentaires, badges), l'immédiateté des notifications améliore significativement l'engagement. Les utilisateurs s'attendent à du temps réel en 2026.

**Proposed solution**:
- Dépendance : `socket.io` (backend) + `socket.io-client` (frontend)
- Serveur WebSocket intégré au serveur Express existant (même port 3000, upgrade HTTP → WS)
- Namespace `/notifications` : l'utilisateur s'authentifie avec son JWT à la connexion
- Événements émis : `notification:new` (nouveau follower, commentaire, badge, recette approuvée), `notification:count` (compteur non-lus mis à jour)
- Côté frontend : hook `useRealtimeNotifications()` qui remplace le polling actuel dans `NotificationBell.jsx`
- Fallback : si WebSocket échoue, retomber sur le polling existant (graceful degradation)
- Redis Pub/Sub pour supporter plusieurs instances Node si nécessaire (futur scaling)
- Impact sur pm2 : configurer `--max-memory-restart` pour gérer les connexions longues
- Complexité : L

---

### Menu cocktail imprimable pour événements

**Labels**: `feature`, `frontend`, `backend`, `product:monetization`
**Priority**: 🟡 Medium
**File(s)**: `—`

**Problem**:
L'utilisateur qui organise une soirée cocktails n'a pas de moyen de créer un menu physique avec ses recettes sélectionnées. Il doit copier-coller manuellement dans Word ou Canva.

**Why it's a problem**:
Le menu de soirée est un use case concret à forte valeur perçue. C'est aussi un vecteur de viralité (le menu affiche le logo et l'URL de l'app). Les organisateurs de soirées sont des power users qui invitent d'autres utilisateurs potentiels.

**Proposed solution**:
- Endpoint `POST /menus/generate` [auth] `{ title: "Soirée tropicale", recipeIds: [1,2,3,4], template: "elegant|tropical|minimal", showIngredients: true }` → retourne un PDF
- 3 templates de menu : élégant (fond noir, typographie dorée), tropical (couleurs vives, illustrations), minimal (épuré, blanc)
- Contenu par recette : nom, courte description, difficulté (icône), ingrédients (optionnel)
- Footer : "Recettes sur cocktail-app.fr" + QR code vers la collection ou l'app
- Génération PDF avec `pdfkit` (déjà installé) — réutiliser l'infrastructure de l'export recette
- Page `/menu-builder` : sélection de recettes (depuis favoris, collection, ou recherche), choix du template, aperçu, téléchargement
- Feature premium : templates premium + customisation couleurs/logo perso
- Complexité : L

---

### Widget recette embeddable pour sites externes

**Labels**: `feature`, `frontend`, `backend`, `product:growth`
**Priority**: 🟡 Medium
**File(s)**: `—`

**Problem**:
Les blogueurs food et les sites partenaires ne peuvent pas intégrer une recette de cocktail-app dans leur contenu. Le partage se limite à un lien URL simple.

**Why it's a problem**:
Les widgets embeddables sont un levier d'acquisition organique puissant. Chaque blog qui embed une recette crée un backlink et expose l'app à une nouvelle audience. C'est le modèle qui a fait le succès de YouTube, Spotify et Pinterest.

**Proposed solution**:
- Endpoint `GET /embed/recipes/:id` : retourne une page HTML autonome (iframe-ready) avec la recette stylisée, le logo, et un lien "Voir sur cocktail-app.fr"
- Design : carte compacte (350x500px par défaut), responsive, thème clair/sombre auto
- Bouton "Embed" sur RecipeDetail → modale avec le code `<iframe>` à copier
- Snippet : `<iframe src="https://cocktail-app.fr/embed/recipes/42" width="350" height="500" frameborder="0"></iframe>`
- Options via query params : `?theme=dark&lang=fr&showIngredients=true`
- Endpoint `GET /embed/collections/:id` : même principe pour les collections (carrousel horizontal)
- CSP : autoriser l'embedding via `X-Frame-Options: ALLOWALL` uniquement sur `/embed/*`
- Tracking : compteur d'affichages embed par recette (Redis INCR)
- Complexité : M

---

### Glossaire et encyclopédie du cocktail (SEO)

**Labels**: `feature`, `frontend`, `backend`, `database`, `product:growth`
**Priority**: 🟡 Medium
**File(s)**: `—`

**Problem**:
L'app ne capture pas le trafic SEO informationnel : "qu'est-ce qu'un digestif", "différence shaker boston vs cobbler", "histoire du Manhattan". Ce trafic long-tail est capté par Wikipedia et des blogs spécialisés.

**Why it's a problem**:
Le trafic informationnel représente 60-70% des recherches liées aux cocktails. Ces visiteurs sont des prospects qualifiés (ils s'intéressent aux cocktails) mais l'app n'a pas de page pour les accueillir. Le glossaire crée des centaines de pages indexables.

**Proposed solution**:
- Nouveau modèle Prisma `GlossaryEntry` : `id`, `term String @unique`, `slug String @unique`, `definition String`, `longDescription String?` (markdown), `category String` (enum-like: "technique", "ingrédient", "verre", "style", "histoire"), `relatedRecipeIds Int[]`, `relatedEntryIds Int[]`, `createdAt`, `updatedAt`
- Endpoints : `GET /glossary` (liste paginée, filtrable par catégorie), `GET /glossary/:slug` (entrée complète avec recettes liées)
- Page `/glossary` : index alphabétique + filtres par catégorie, barre de recherche
- Page `/glossary/:slug` : définition + description longue + recettes liées (carrousel) + termes connexes
- Seed initial : 50-80 termes courants (types de verres, techniques, styles, spiritueux de base, garnitures)
- Liens croisés dans les recettes : mots du glossaire détectés dans les étapes → tooltips automatiques
- Schema.org `DefinedTerm` pour chaque entrée
- Complexité : L

---

### Pages de destination SEO par catégorie et tag

**Labels**: `feature`, `frontend`, `backend`, `product:growth`
**Priority**: 🟠 High
**File(s)**: `—`

**Problem**:
Les catégories et tags n'ont pas de pages dédiées avec URL propre. Les recherches "cocktail rhum facile", "cocktails d'été", "recettes tiki" ne correspondent à aucune page indexable. Tout passe par des paramètres de query string sur `/recipes`.

**Why it's a problem**:
Les pages de catégorie/tag avec URL propre sont les pages les mieux positionnées en SEO pour les sites de recettes. Marmiton, 750g, et AllRecipes génèrent la majorité de leur trafic via ces pages. Sans elles, l'app est invisible sur les requêtes à fort volume.

**Proposed solution**:
- Ajouter `slug String @unique` et `description String?` au modèle `Category` (migration)
- Routes frontend : `/categories/:slug` et `/tags/:name`
- Réutiliser le composant `RecipeList` avec filtre pré-appliqué (prop `defaultCategory` ou `defaultTag`)
- Prerender enrichi : `<title>Cocktails {catégorie} — {count} recettes | Écume</title>`, meta description dynamique avec nombre de recettes et tags populaires
- Section "Explorer par catégorie" sur LandingPage : cartes visuelles avec image de fond et count
- Section "Tags populaires" : nuage de tags cliquables avec taille proportionnelle au nombre de recettes
- Inclure ces pages dans le sitemap existant avec priorité 0.7
- Breadcrumbs Schema.org sur les pages catégorie/tag
- Complexité : M

---

### Newsletter hebdomadaire automatique

**Labels**: `feature`, `backend`, `infra`, `product:growth`
**Priority**: 🟢 Low
**File(s)**: `—`

**Problem**:
Aucun canal de réengagement par email. Les utilisateurs inactifs ne reçoivent jamais de rappel. Le push notification ne touche que ceux qui l'ont activé (~10-15% typiquement).

**Why it's a problem**:
L'email reste le canal de réengagement avec le meilleur ROI. Une newsletter hebdomadaire avec le cocktail du moment, les nouvelles recettes et les défis en cours ramène 5-10% des destinataires sur l'app chaque semaine.

**Proposed solution**:
- Nouveau modèle Prisma `NewsletterSubscription` : `userId Int @unique`, `email String`, `active Boolean @default(true)`, `unsubscribeToken String @unique @default(uuid())`, `createdAt`
- Opt-in à l'inscription (checkbox, non coché par défaut) + page profil pour gérer
- Endpoints : `POST /newsletter/subscribe` [auth], `GET /newsletter/unsubscribe/:token` (lien dans l'email)
- Script CRON hebdomadaire (`scripts/send-newsletter.js`) : génère le contenu (cocktail du jour, top 3 nouvelles recettes, défi en cours, stats communauté) et envoie via `nodemailer` + SMTP
- Template HTML responsive simple (inline CSS, compatible Gmail/Outlook)
- Footer : lien de désinscription obligatoire (RGPD)
- Tracking : ouverture (pixel 1x1) + clics (URLs wrappées)
- Envoi via SMTP existant ou Brevo (ex-Sendinblue) gratuit jusqu'à 300 emails/jour
- Complexité : L

---

### Leaderboard communautaire

**Labels**: `feature`, `frontend`, `backend`, `product:ux`
**Priority**: 🟢 Low
**File(s)**: `—`

**Problem**:
Pas de classement visible des utilisateurs les plus actifs ou des meilleures recettes. Les badges sont personnels mais il n'y a pas de dimension compétitive publique.

**Why it's a problem**:
Les leaderboards créent une boucle d'émulation : voir quelqu'un au-dessus de soi motive à contribuer plus. C'est un levier d'engagement prouvé sur les apps communautaires (Stack Overflow, Untappd, Reddit karma).

**Proposed solution**:
- Endpoint `GET /leaderboard` : retourne les classements par période (semaine, mois, all-time)
- Catégories de classement : "Meilleur barman" (plus de recettes publiées bien notées), "Critique prolifique" (plus de notes données), "Populaire" (plus de followers), "Explorateur" (plus de catégories différentes notées), "Social" (plus de commentaires)
- Calcul : requêtes d'agrégation sur les tables existantes (Rating, Comment, Follow, Recipe), cache Redis TTL 1h
- Page `/leaderboard` : onglets par catégorie, top 20 par classement, avatar + pseudo + score + badge le plus récent
- Highlight si l'utilisateur connecté est dans le top (surbrillance de sa ligne)
- Section "Top contributeurs" sur la LandingPage (top 3 avec avatars)
- Option opt-out : `showInLeaderboard Boolean @default(true)` sur le modèle User pour les utilisateurs qui ne souhaitent pas apparaître
- Complexité : M

---

### Scan de bouteille pour ajout au bar virtuel

**Labels**: `feature`, `frontend`, `backend`, `product:tech`
**Priority**: 🟢 Low
**File(s)**: `—`

**Problem**:
L'ajout d'ingrédients au bar virtuel se fait manuellement par recherche textuelle. C'est fastidieux quand on a 10-20 bouteilles à ajouter. L'utilisateur doit connaître le nom exact de chaque spiritueux.

**Why it's a problem**:
La friction d'onboarding du bar virtuel limite son adoption. Si remplir son bar prend 5 minutes de recherche, beaucoup abandonnent. Le scan de bouteille réduit cette friction à quelques secondes par bouteille.

**Proposed solution**:
- Utiliser l'API Claude Vision pour identifier les bouteilles à partir d'une photo de l'étiquette
- Endpoint `POST /bar/scan` [auth] : reçoit une image, envoie à Claude Vision avec le prompt "Identifie le spiritueux/ingrédient sur cette étiquette. Retourne le type d'ingrédient (vodka, gin, rhum, etc.) et la marque."
- Matching : recherche le type retourné dans la table Ingredient (`WHERE name ILIKE '%{type}%'`)
- Si trouvé → propose l'ajout au bar (avec confirmation)
- Si pas trouvé → propose de créer un nouvel ingrédient ou de choisir parmi les suggestions proches
- Bouton "Scanner une bouteille" sur la page MyBar avec accès caméra
- Mode batch : "Scanner plusieurs bouteilles" → scanner en série avec ajout progressif
- Fallback : si l'identification échoue, proposer la recherche textuelle classique
- Rate limit : 10 scans/jour
- Complexité : M

---

### Estimation du coût d'une recette

**Labels**: `feature`, `frontend`, `backend`, `database`, `product:ux`
**Priority**: 🟢 Low
**File(s)**: `—`

**Problem**:
L'utilisateur ne sait pas combien va lui coûter un cocktail avant de le préparer. Il n'y a aucune notion de prix dans l'app, ni par ingrédient ni par recette.

**Why it's a problem**:
Le budget est un critère de choix important, surtout pour les débutants qui doivent acheter des bouteilles entières. Afficher "~3.50€ le verre" aide à la décision et positionne l'app comme un outil pratique, pas juste un catalogue.

**Proposed solution**:
- Ajouter `estimatedPricePerUnit Float?` et `unitSize Float?` (en cl ou g) au modèle Ingredient : prix moyen d'une bouteille standard divisé par la contenance
- Interface admin pour renseigner les prix par ingrédient (ou import CSV)
- Calcul automatique du coût par recette : somme de (quantité × prix unitaire) pour chaque ingrédient
- Affichage sur RecipeDetail : badge "~X.XX€ / verre" à côté de la difficulté et du temps
- Filtre sur RecipeList : "Budget max par verre" (slider)
- Endpoint `GET /recipes?maxCost=5` : filtre côté backend
- Mise à jour des prix : manuelle par admin, ou scraping automatique futur
- Complexité : M

---

### Historique et versioning des recettes

**Labels**: `feature`, `backend`, `database`, `product:tech`
**Priority**: 🟢 Low
**File(s)**: `—`

**Problem**:
Quand une recette est modifiée (par l'auteur ou l'admin), la version précédente est perdue. Impossible de revenir en arrière ou de voir l'évolution d'une recette.

**Why it's a problem**:
Le versioning protège contre les erreurs de modification et crée un historique consultable. Pour les recettes communautaires, voir qui a modifié quoi et quand est essentiel à la confiance. Wikipedia et GitHub ont démontré la valeur de l'historique des modifications.

**Proposed solution**:
- Nouveau modèle Prisma `RecipeRevision` : `id`, `recipeId Int`, `version Int`, `data Json` (snapshot complet de la recette : nom, description, ingrédients, étapes, tags), `authorId Int`, `message String?` (description du changement), `createdAt`, `@@unique([recipeId, version])`, `@@index([recipeId, createdAt])`
- Hook dans `PUT /recipes/:id` : avant la mise à jour, sauvegarder l'état actuel dans RecipeRevision avec version incrémentée
- Endpoint `GET /recipes/:id/history` : liste des révisions avec auteur, date, message
- Endpoint `GET /recipes/:id/revisions/:version` : contenu d'une révision spécifique
- Endpoint `POST /recipes/:id/revert/:version` [auth, auteur ou admin] : restaure une version précédente (crée une nouvelle révision)
- Affichage sur RecipeDetail : lien "Historique (N versions)" pour les recettes avec > 1 révision
- Complexité : L

---

### Collections curées par des experts (premium)

**Labels**: `feature`, `frontend`, `backend`, `database`, `product:monetization`
**Priority**: 🟢 Low
**File(s)**: `—`

**Problem**:
Les collections sont uniquement créées par les utilisateurs. Il n'y a pas de contenu curé par des professionnels (barmans, mixologues) qui apporte une valeur éditoriale et une crédibilité à l'app.

**Why it's a problem**:
Le contenu expert différencie l'app d'un simple catalogue collaboratif. C'est un argument premium fort ("Collections exclusives par des barmans professionnels") et un levier de crédibilité pour les débutants qui ne savent pas par où commencer.

**Proposed solution**:
- Ajouter `isCurated Boolean @default(false)`, `curatorName String?`, `curatorBio String?`, `curatorAvatar String?` au modèle Collection
- Collections curées visibles par tous mais contenu complet réservé aux premium (les free voient les 3 premières recettes + blur sur le reste)
- Endpoint `GET /collections/curated` : liste des collections curées
- Section "Sélections d'experts" sur la LandingPage (carrousel)
- Page `/curated` : toutes les collections expertes avec bio du curateur
- Admin crée les collections curées (interface existante + champs supplémentaires)
- Partenariat potentiel : inviter des barmans locaux à créer des collections (échange de visibilité)
- Upsell dans la modale de blur : "Débloquez cette collection avec Premium"
- Complexité : M

---

### Mode déconnecté intelligent (PWA avancé)

**Labels**: `feature`, `frontend`, `product:tech`
**Priority**: 🟡 Medium
**File(s)**: `—`

**Problem**:
Le service worker actuel offre un fallback offline basique, mais l'utilisateur ne peut pas réellement naviguer dans l'app sans connexion. Les favoris, le bar virtuel et les collections ne sont pas disponibles hors-ligne.

**Why it's a problem**:
Le use case "au supermarché sans réseau pour vérifier les ingrédients" ou "en cave sans WiFi pour choisir un cocktail" est courant. Un mode offline intelligent transforme l'app en outil indispensable, même sans réseau.

**Proposed solution**:
- Stratégie de cache par type de contenu :
  - Favoris : cache automatique en IndexedDB à chaque ajout/suppression (hook dans `useFavorites`)
  - Bar virtuel : cache la liste d'ingrédients en IndexedDB
  - Collections : cache les collections de l'utilisateur avec leurs recettes
  - Dernières recettes consultées : cache les 20 dernières fiches visitées
- Hook `useOfflineData()` : détecte le statut réseau, bascule entre API et IndexedDB
- Sync en arrière-plan : quand la connexion revient, `navigator.serviceWorker.ready.then(reg => reg.sync.register('sync-favorites'))` pour resynchroniser les actions offline (favoris ajoutés/retirés, notes)
- Indicateur offline amélioré : l'`OfflineBanner` existant indique aussi la fraîcheur des données ("Données du 31 mars 2026")
- Liste de courses : export texte brut disponible offline (copier-coller)
- Complexité : L

---

