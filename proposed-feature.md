# 💡 Propositions de Features — Notion Shopping

> Document listant les améliorations, nouvelles fonctionnalités et correctifs envisagés pour le projet **Notion Shopping**.

---

## 🐛 Fixes

### F-01 — Sécurisation du cookie d'authentification

**Problème actuel :**  
Le middleware stocke le mot de passe en clair (`APP_PASSWORD`) directement comme valeur du cookie `auth_token`. N'importe qui ayant accès aux DevTools peut lire la valeur du cookie et connaître le mot de passe de l'application.

**Correction proposée :**  
Générer un token signé (ex. JWT signé avec un secret serveur, ou un hash HMAC du mot de passe) lors du login, et valider ce token côté middleware plutôt que de comparer le mot de passe brut.

**Bénéfice :** Empêche l'exposition du mot de passe en clair dans le navigateur et renforce la sécurité globale de l'accès.

---

### F-02 — Gestion d'erreur si la base Notion est vide ou mal configurée

**Problème actuel :**  
Si la base Notion ne contient aucun repas pour les 10 prochains jours, l'application affiche simplement un état d'erreur peu explicite.

**Correction proposée :**  
Distinguer le cas "base vide / aucun repas planifié" de l'erreur API, et afficher un message d'état dédié (ex. *"Aucun repas planifié pour les 10 prochains jours"*) avec un call-to-action pour aller remplir le planning Notion.

**Bénéfice :** Meilleure expérience utilisateur, surtout en début de semaine.

---

## ✨ Améliorations

### A-01 — Fenêtre de planification configurable

**Fonctionnalité actuelle :**  
L'app récupère les repas des **10 prochains jours** de façon fixe.

**Amélioration proposée :**  
Permettre à l'utilisateur de choisir la fenêtre de planification (7 jours, 14 jours, mois complet…) via un sélecteur dans l'interface, ou via une variable d'environnement `NOTION_PLANNING_DAYS`.

**Bénéfice :** S'adapte aux habitudes de chacun (courses hebdomadaires ou bi-mensuelles).

---

### A-02 — Ajout manuel d'articles à la liste

**Fonctionnalité actuelle :**  
La liste est entièrement générée par Mistral AI, sans possibilité d'y ajouter des articles manuellement.

**Amélioration proposée :**  
Ajouter un champ de saisie en bas de la liste pour permettre d'ajouter un article personnalisé (nom + quantité optionnelle + catégorie). L'article est ajouté localement et peut être coché/supprimé comme les autres.

**Bénéfice :** Couvre les besoins ponctuels non liés au planning (ex. : dentifrice oublié, envie du moment).

---

### A-03 — Export / Partage de la liste

**Fonctionnalité actuelle :**  
La liste ne peut être sauvegardée que dans Notion (bouton "Enregistrer dans Notion").

**Amélioration proposée :**  
Ajouter des options d'export :
- **Copier en texte brut** (copie dans le presse-papier, format simple par catégorie)
- **Partager via Web Share API** (mobile : WhatsApp, SMS, Notes…)
- **Télécharger en PDF** (via impression navigateur ou une lib comme `html2canvas`)

**Bénéfice :** Permet de partager la liste de courses avec quelqu'un d'autre (conjoint, colocataire) ou de l'utiliser sans connexion.

---

### A-04 — Filtres et recherche dans la liste générée

**Fonctionnalité actuelle :**  
Toutes les catégories s'affichent en bloc, sans moyen de filtrer.

**Amélioration proposée :**  
- Ajouter un champ de recherche en temps réel pour filtrer les articles par mot-clé.
- Ajouter des boutons de filtre rapide par catégorie (Fruits & Légumes, Viandes, etc.) pour afficher/masquer des sections.

**Bénéfice :** Facilite la navigation en rayon lors des courses (ex. : ne voir que la section "Poissons & Fruits de mer").

---

### A-05 — Historique des listes générées

**Fonctionnalité actuelle :**  
Chaque génération écrase la liste précédente, aussi bien en mémoire qu'à la sauvegarde Notion.

**Amélioration proposée :**  
Conserver localement (localStorage) les N dernières listes générées (avec date), accessibles depuis un panneau "Historique". L'utilisateur peut restaurer une ancienne liste ou la comparer à la courante.

**Bénéfice :** Permet de retrouver une liste passée si on a fermé l'onglet par erreur, ou de réutiliser une liste d'une semaine similaire.

---

### A-06 — Mode hors-ligne (PWA)

**Fonctionnalité actuelle :**  
L'application nécessite une connexion pour fonctionner (appels Notion + Mistral).

**Amélioration proposée :**  
Transformer l'application en **Progressive Web App (PWA)** :
- Ajout d'un `manifest.json` pour l'installation sur écran d'accueil mobile.
- Mise en cache de la dernière liste générée via un Service Worker, consultable sans connexion.

**Bénéfice :** Utilisable en supermarché même en zone de mauvaise réception. Ajoute une icône sur le téléphone pour un accès rapide.

---

### A-07 — Indicateur de progression des courses (compteur coché/total)

**Fonctionnalité actuelle :**  
Les articles sont cochables mais aucun récapitulatif global n'est affiché.

**Amélioration proposée :**  
Afficher une barre de progression ou un compteur en haut de la liste du type *"12 / 27 articles cochés"* qui se met à jour en temps réel. Optionnellement, afficher une animation de succès quand tout est coché.

**Bénéfice :** Donne une vision immédiate de l'avancement des courses et motive à tout cocher.

---

## 🚀 Nouvelles Fonctionnalités

### NF-01 — Support multi-utilisateurs / multi-bases Notion

**Description :**  
Permettre à plusieurs utilisateurs de connecter leur propre base Notion via une interface de configuration (saisie de `NOTION_API_KEY` et `NOTION_PAGE_ID` directement dans l'UI), sans avoir à modifier les variables d'environnement.

**Bénéfice :** Transforme l'application en outil générique déployable pour n'importe qui, sans configuration serveur.

---

### NF-02 — Estimation budgétaire de la liste

**Description :**  
Permettre à l'utilisateur de saisir des prix moyens par article (ou utiliser une API de prix comme celle d'une enseigne de grande surface), et afficher un total estimé pour la liste de courses.

**Bénéfice :** Aide à anticiper le budget courses de la semaine et à prioriser les achats si nécessaire.

---

### NF-03 — Détection des ingrédients déjà disponibles ("frigo virtuel")

**Description :**  
Permettre à l'utilisateur de gérer un inventaire simplifié de ce qu'il a déjà chez lui (frigo, placard). Avant de générer la liste, Mistral (ou un filtre local) soustrait les ingrédients déjà disponibles.

**Bénéfice :** Évite d'acheter des produits en double et réduit le gaspillage alimentaire.

---

### NF-04 — Suggestions de menus manquants

**Description :**  
Si certains jours du planning Notion sont vides (aucune recette planifiée), afficher une suggestion de repas générée par Mistral en tenant compte des recettes déjà planifiées cette semaine (variété, équilibre nutritionnel).

**Bénéfice :** Complète le planning de façon cohérente et aide à l'inspiration culinaire sans quitter l'app.

---

### NF-05 — Thème sombre (Dark Mode)

**Description :**  
Ajouter la prise en charge du mode sombre, en respectant la préférence système (`prefers-color-scheme`) et en ajoutant un bouton de bascule dans l'en-tête. La palette de couleurs serait adaptée (fond sombre, textes clairs, accents verts conservés).

**Bénéfice :** Confort visuel amélioré en soirée ou dans un environnement peu éclairé (ex. : cuisine la nuit).

---

*Document généré le 22 avril 2026 — à compléter et prioriser selon les besoins.*
