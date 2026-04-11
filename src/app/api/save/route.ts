export const runtime = "nodejs";

import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const pageId = process.env.NOTION_PAGE_ID;

export async function POST(req: Request) {
  if (!process.env.NOTION_API_KEY || !pageId) {
    return NextResponse.json(
      { error: "Notion API key or Page ID missing" },
      { status: 500 },
    );
  }

  try {
    const { items } = await req.json();

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Items array is required" },
        { status: 400 },
      );
    }

    // 1. Fetch children to find old shopping list
    const response: any = await notion.blocks.children.list({
      block_id: pageId,
    });

    const blocks = response.results;
    let listStartIndex = -1;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (
        block.type === "heading_2" &&
        block.heading_2.rich_text.some((t: any) =>
          t.plain_text.includes("Liste de courses"),
        )
      ) {
        listStartIndex = i;
        break;
      }
    }

    // 2. Delete old list if it exists (all blocks after the heading_2)
    if (listStartIndex !== -1) {
      for (let i = listStartIndex; i < blocks.length; i++) {
        await notion.blocks.delete({
          block_id: blocks[i].id,
        });
      }
    }

    // 3. Group items by category
    const categories: { [key: string]: typeof items } = {};
    items.forEach((it) => {
      if (!categories[it.category]) categories[it.category] = [];
      categories[it.category].push(it);
    });

    // 4. Create new blocks
    const newBlocks: any[] = [
      {
        object: "block",
        type: "divider",
        divider: {},
      },
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [
            {
              type: "text",
              text: {
                content: `🛒 Liste de courses — ${new Date().toLocaleDateString("fr-FR")}`,
              },
            },
          ],
        },
      },
    ];

    Object.keys(categories).forEach((cat) => {
      newBlocks.push({
        object: "block",
        type: "heading_3",
        heading_3: {
          rich_text: [{ type: "text", text: { content: cat } }],
        },
      });

      categories[cat].forEach((it) => {
        newBlocks.push({
          object: "block",
          type: "to_do",
          to_do: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: `${it.item}${it.quantity ? ` (${it.quantity})` : ""}`,
                },
              },
            ],
            checked: false,
          },
        });
      });
    });

    // 5. Append blocks to notion
    await notion.blocks.children.append({
      block_id: pageId,
      children: newBlocks,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving to Notion:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
