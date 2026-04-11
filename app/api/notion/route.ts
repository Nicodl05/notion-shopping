import { Client } from "@notionhq/client";
import { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { NotionBlock } from "@/app/types";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const pageId = process.env.NOTION_PAGE_ID!;

function extractTextFromBlock(block: BlockObjectResponse): string {
  const type = block.type;

  const richTextTypes = [
    "paragraph",
    "heading_1",
    "heading_2",
    "heading_3",
    "bulleted_list_item",
    "numbered_list_item",
    "to_do",
    "quote",
    "callout",
  ] as const;

  for (const t of richTextTypes) {
    if (
      type === t &&
      t in block &&
      (block as Record<string, unknown>)[t] !== null
    ) {
      const blockData = (block as Record<string, unknown>)[t] as {
        rich_text?: Array<{ plain_text: string }>;
      };
      if (blockData?.rich_text) {
        return blockData.rich_text.map((rt) => rt.plain_text).join("");
      }
    }
  }

  return "";
}

export async function GET() {
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

    const blocks: NotionBlock[] = allBlocks.map((block) => ({
      id: block.id,
      type: block.type,
      text: extractTextFromBlock(block),
    }));

    const content = blocks
      .filter((b) => b.text.trim() !== "")
      .map((b) => b.text)
      .join("\n");

    return Response.json({ content, blocks });
  } catch (error) {
    console.error("Notion API error:", error);
    return Response.json(
      { error: "Failed to fetch Notion page content" },
      { status: 500 }
    );
  }
}
