import { Client } from "@notionhq/client";
import { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { ShoppingItem } from "@/app/types";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const pageId = process.env.NOTION_PAGE_ID!;

const SHOPPING_HEADING = "Liste de courses";

async function deleteOldShoppingList(): Promise<void> {
  // Find existing shopping list heading and delete everything after it
  const allBlocks: BlockObjectResponse[] = [];
  let cursor: string | undefined = undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    });
    allBlocks.push(...(response.results as BlockObjectResponse[]));
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  // Find the divider or heading_2 that precedes our shopping list
  let shoppingListStart = -1;
  for (let i = 0; i < allBlocks.length; i++) {
    const block = allBlocks[i];
    if (block.type === "heading_2") {
      const h2 = block as BlockObjectResponse & {
        heading_2: { rich_text: Array<{ plain_text: string }> };
      };
      const text = h2.heading_2?.rich_text
        ?.map((rt) => rt.plain_text)
        .join("") ?? "";
      if (text.includes(SHOPPING_HEADING)) {
        // Look for a divider right before this heading
        shoppingListStart = i > 0 && allBlocks[i - 1].type === "divider" ? i - 1 : i;
        break;
      }
    }
  }

  if (shoppingListStart !== -1) {
    const blocksToDelete = allBlocks.slice(shoppingListStart);
    for (const block of blocksToDelete) {
      await notion.blocks.delete({ block_id: block.id });
    }
  }
}

function groupByCategory(items: ShoppingItem[]): Map<string, ShoppingItem[]> {
  const map = new Map<string, ShoppingItem[]>();
  for (const item of items) {
    const existing = map.get(item.category) ?? [];
    existing.push(item);
    map.set(item.category, existing);
  }
  return map;
}

export async function POST(request: Request) {
  if (!process.env.NOTION_API_KEY) {
    return Response.json(
      { error: "NOTION_API_KEY is not configured" },
      { status: 500 }
    );
  }
  if (!pageId) {
    return Response.json(
      { error: "NOTION_PAGE_ID is not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { items } = body as { items: ShoppingItem[] };

    if (!Array.isArray(items)) {
      return Response.json(
        { error: "Missing or invalid 'items' field in request body" },
        { status: 400 }
      );
    }

    await deleteOldShoppingList();

    const now = new Date();
    const dateStr = now.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const grouped = groupByCategory(items);
    const newBlocks: Parameters<typeof notion.blocks.children.append>[0]["children"] = [];

    // Add divider
    newBlocks.push({ object: "block", type: "divider", divider: {} });

    // Add main heading
    newBlocks.push({
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [
          {
            type: "text",
            text: { content: `🛒 Liste de courses — ${dateStr}` },
          },
        ],
      },
    });

    // Add categories and items
    for (const [category, categoryItems] of grouped) {
      newBlocks.push({
        object: "block",
        type: "heading_3",
        heading_3: {
          rich_text: [
            {
              type: "text",
              text: { content: category },
            },
          ],
        },
      });

      for (const shoppingItem of categoryItems) {
        const itemText = shoppingItem.quantity
          ? `${shoppingItem.item} - ${shoppingItem.quantity}`
          : shoppingItem.item;

        newBlocks.push({
          object: "block",
          type: "to_do",
          to_do: {
            rich_text: [
              {
                type: "text",
                text: { content: itemText },
              },
            ],
            checked: false,
          },
        });
      }
    }

    await notion.blocks.children.append({
      block_id: pageId,
      children: newBlocks,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Save to Notion error:", error);
    return Response.json(
      { error: "Failed to save shopping list to Notion" },
      { status: 500 }
    );
  }
}
