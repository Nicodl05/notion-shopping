# Notion Shopping

Génère une liste de courses hebdomadaire à partir d'un planning de repas Notion, en utilisant Mistral AI.

## Stack

- **Next.js 14** — App Router, TypeScript
- **Mistral AI** — `mistral-large-latest` pour la génération structurée
- **Notion REST API** — récupération du planning (filtre sur les 10 prochains jours)
- **Tailwind CSS** — UI responsive, police DM Sans

## Variables d'environnement

Créer un fichier `.env.local` à la racine :

```env
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxx
NOTION_PAGE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- `NOTION_API_KEY` : clé d'intégration Notion (Paramètres → Intégrations)
- `NOTION_PAGE_ID` : ID de la base de données Notion (32 derniers caractères de l'URL)

## Lancer le projet

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Fonctionnement

1. Au chargement, l'app récupère les repas planifiés dans les 10 prochains jours via l'API Notion.
2. En cliquant sur "Générer ma liste de courses", Mistral analyse les ingrédients et produit une liste structurée par catégorie.
3. Chaque article est cochable, avec indication des quantités estimées (sans chiffre) vs. certaines.
