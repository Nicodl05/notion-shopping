# Notion Shopping

Generates a weekly shopping list from a Notion meal planning database, using Mistral AI.

## Stack

- **Next.js 14** — App Router, TypeScript
- **Mistral AI** — `open-mistral-7b` (or latest) for structured generation
- **Notion REST API** — meal planning retrieval (filters for next 10 days)
- **Tailwind CSS** — responsive UI, DM Sans font

## Environment Variables

Create a `.env.local` file in the root directory:

```env
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxx
NOTION_PAGE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- `NOTION_API_KEY`: Notion integration key (Settings → Integrations)
- `NOTION_PAGE_ID`: Notion database ID (last 32 characters of the URL)

Authentication (required, fail-closed: without them every page redirects to `/login` and every `/api/*` route returns 503 or 401):

```env
APP_PASSWORD=your-app-password
SESSION_SECRET=generate-with-openssl-rand-base64-32
```

- `APP_PASSWORD`: password for the login page
- `SESSION_SECRET`: HMAC-SHA256 key that signs session cookies, at least 32 characters. Generate with `openssl rand -base64 32`. Set it locally and on Vercel (Project Settings → Environment Variables). Changing it invalidates all sessions.

## Run the Project

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

1. On load, the app fetches planned meals for the next 10 days via the Notion API.
2. By clicking "Générer ma liste de courses", Mistral analyzes ingredients and produces a list structured by categories.
3. Every item is checkable, with indications for estimated quantities (??) versus explicit ones.
4. **Chef Monsieur le Chat**: Includes a personalized AI chef section for additional advice, wine pairings (with specific grape varieties), and culinary suggestions.
5. **Smart UI**: Collapsible categories and item details (recipes/calculations) for a minimalist shopping experience.

## AI Credits

Parts of this code were generated and refined with **GitHub Copilot**.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
