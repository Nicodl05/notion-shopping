import Anthropic from "@anthropic-ai/sdk";
import { ShoppingItem } from "@/app/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Tu es un assistant culinaire. À partir du contenu d'une page Notion (recettes, menus, notes), génère une liste de courses complète organisée par catégories. Format : une ligne par article, préfixée par la catégorie. Ex: 'Fruits & Légumes : Tomates - 500g'. Si aucun aliment détecté, retourne uniquement AUCUN_ALIMENT.`;

function parseShoppingList(text: string): ShoppingItem[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const items: ShoppingItem[] = [];

  for (const line of lines) {
    // Expected format: "Category : Item - Quantity" or "Category : Item"
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const category = line.substring(0, colonIdx).trim();
    const rest = line.substring(colonIdx + 1).trim();

    const dashIdx = rest.lastIndexOf(" - ");
    if (dashIdx !== -1) {
      const item = rest.substring(0, dashIdx).trim();
      const quantity = rest.substring(dashIdx + 3).trim();
      items.push({ category, item, quantity, checked: false });
    } else {
      items.push({ category, item: rest, quantity: "", checked: false });
    }
  }

  return items;
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { content } = body as { content: string };

    if (!content || typeof content !== "string") {
      return Response.json(
        { error: "Missing or invalid 'content' field in request body" },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    if (responseText.trim() === "AUCUN_ALIMENT") {
      return Response.json({ items: [], noFood: true });
    }

    const items = parseShoppingList(responseText);

    return Response.json({ items });
  } catch (error) {
    console.error("Anthropic API error:", error);
    return Response.json(
      { error: "Failed to generate shopping list" },
      { status: 500 }
    );
  }
}
