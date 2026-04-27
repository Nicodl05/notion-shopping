# Feature: Recipe Details Page

## Description

Cette fonctionnalité ajoute une page de détails pour chaque recette, permettant aux utilisateurs de voir toutes les informations provenant de Notion, y compris les ingrédients requis et les liens vers les recettes.

## Problème résolu

Lorsque le titre d'une recette n'est pas rempli dans Notion, l'application n'avait pas accès au lien de la recette ni au nom du plat. Cette fonctionnalité assure que toutes les informations sont récupérées et affichées de manière claire.

## Changements apportés

### 1. API mise à jour (`/api/notion`)
- Retourne maintenant un tableau `recipes` contenant les données structurées de chaque recette
- Chaque recette inclut :
  - `id` : L'identifiant Notion de la page
  - `name` : Le nom de la recette
  - `url` : L'URL de la recette (depuis le lien dans le titre ou l'URL de la page Notion)
  - `dateLabel` : La date formatée en français
  - `ingredients` : Liste des ingrédients avec leurs noms et valeurs
  - `hasTitle` : Indique si le titre est renseigné dans Notion

### 2. Nouvelle API (`/api/recipe/[id]`)
- Endpoint pour récupérer les détails complets d'une recette spécifique
- Récupère toutes les propriétés de la page Notion
- Sépare les ingrédients des autres propriétés

### 3. Page de détails de recette (`/recipe/[id]`)
- Affiche le nom de la recette en grand
- Affiche la date prévue
- Bouton pour ouvrir la recette externe (si disponible)
- Section "Ingrédients requis" avec tous les ingrédients listés
- Section "Informations supplémentaires" pour les autres propriétés
- Avertissement si le titre n'est pas renseigné dans Notion
- Bouton de retour au planning

### 4. Composant NotionContent mis à jour
- Les noms de recettes sont maintenant cliquables
- Lien vers la page de détails de la recette
- Indicateur visuel (⚠️) pour les recettes sans titre
- Hover effect pour une meilleure UX

### 5. Types TypeScript
- Ajout de `RecipeIngredient` interface
- Ajout de `Recipe` interface
- Exportés depuis `/src/types/shopping.ts`

### 6. Configuration ESLint
- Désactivation de `@typescript-eslint/no-explicit-any` pour correspondre au style du code existant
- `@typescript-eslint/no-unused-vars` défini comme warning

## Comment utiliser

1. **Page principale** : Les recettes dans le planning sont maintenant cliquables
2. **Cliquer sur une recette** : Ouvre la page de détails avec toutes les informations
3. **Voir la recette complète** : Cliquer sur "Voir la recette" pour ouvrir le lien externe
4. **Retour au planning** : Utiliser le bouton "Retour au planning"

## Cas particuliers

### Recettes sans titre
- Affichées avec un avertissement (⚠️)
- Non cliquables depuis le planning
- Message d'information sur la page de détails

### Recettes sans lien
- La page de détails s'affiche quand même
- Le bouton "Voir la recette" n'apparaît pas

### Ingrédients
- Tous les champs Notion contenant "ingrédient", "ingredient" ou "Σ" sont considérés comme des ingrédients
- Affichés dans une section dédiée avec leurs noms et valeurs

## Structure des fichiers

```
src/
├── app/
│   ├── api/
│   │   ├── notion/route.ts (modifié)
│   │   └── recipe/
│   │       └── [id]/
│   │           └── route.ts (nouveau)
│   ├── recipe/
│   │   └── [id]/
│   │       └── page.tsx (nouveau)
│   └── page.tsx (modifié)
├── components/
│   └── NotionContent.tsx (modifié)
└── types/
    └── shopping.ts (modifié)
```

## Tests recommandés

1. Vérifier que les recettes avec titre sont cliquables
2. Vérifier que les recettes sans titre affichent l'avertissement
3. Vérifier que la page de détails affiche tous les ingrédients
4. Vérifier que le bouton "Voir la recette" fonctionne
5. Vérifier que le bouton retour fonctionne
6. Vérifier la responsivité mobile

## Notes techniques

- Compatible avec Next.js 16.2.3
- Utilise le système de routing App Router
- Gestion d'erreur complète avec messages utilisateur
- Design cohérent avec le reste de l'application
- TypeScript strict activé
