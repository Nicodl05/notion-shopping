# notion-shopping
## notion-shopping

Application web Next.js qui génère une liste de courses à partir du contenu d'une page Notion, en utilisant l'API Claude d'Anthropic.

## Stack

- Next.js 14+ avec App Router
- TypeScript
- Tailwind CSS
- @notionhq/client
- @anthropic-ai/sdk

## Variables d'environnement

Copiez `.env.local.example` en `.env.local` et renseignez vos clés :

```
NOTION_API_KEY=      # Clé d'intégration Notion
NOTION_PAGE_ID=      # ID de la page Notion source
ANTHROPIC_API_KEY=   # Clé API Anthropic
```

## Démarrage

```bash
npm install
npm run dev
```

## Fonctionnement

1. L'app charge le contenu de votre page Notion
2. Cliquez sur "🛒 Générer ma liste de courses"
3. Claude analyse le contenu et génère une liste organisée par catégories
4. Cochez/décochez les articles
5. Cliquez sur "Enregistrer dans Notion" pour sauvegarder la liste dans votre page Notion

## Routes API

- `GET /api/notion` — Récupère le contenu de la page Notion
- `POST /api/generate` — Génère la liste de courses via Claude
- `POST /api/save` — Enregistre la liste dans Notion
