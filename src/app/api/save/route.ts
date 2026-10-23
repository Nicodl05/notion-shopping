export const runtime = "nodejs";

import { APIResponseError, Client } from "@notionhq/client";
import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/session";
import { ALL_CATEGORIES } from "@/lib/categories";
import type { ShoppingItem } from "@/types/shopping";

const SECTION_TITLE = "Liste de courses";
const MAX_ITEMS = 200;
const MAX_FIELD_LENGTH = 200;
const APPEND_CHUNK_SIZE = 100;
const DELETE_DELAY_MS = 350;
// Blocs qui composent la liste elle-même (catégories + articles).
const LIST_BLOCK_TYPES = new Set(["heading_3", "to_do"]);

// Le SDK retente déjà les 429 en respectant Retry-After, avec backoff exponentiel.
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
  retry: { maxRetries: 5, initialRetryDelayMs: 1000, maxRetryDelayMs: 30000 },
});

const pageId = process.env.NOTION_PAGE_ID;

type AnyBlock = { id: string; type: string; [key: string]: any };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function plainText(block: AnyBlock): string {
  const rich = block[block.type]?.rich_text;
  if (!Array.isArray(rich)) return "";
  return rich.map((t: { plain_text?: string }) => t.plain_text ?? "").join("");
}

async function listAllChildren(blockId: string): Promise<AnyBlock[]> {
  const blocks: AnyBlock[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    blocks.push(...(res.results as unknown as AnyBlock[]));
    cursor = res.has_more && res.next_cursor ? res.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

function trimField(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length <= MAX_FIELD_LENGTH ? trimmed : null;
}

// Valide le corps. Renvoie null si invalide, sans détailler la raison.
function parseItems(body: unknown): ShoppingItem[] | null {
  if (typeof body !== "object" || body === null) return null;
  const raw = (body as { items?: unknown }).items;
  if (!Array.isArray(raw) || raw.length > MAX_ITEMS) return null;

  const items: ShoppingItem[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return null;
    }
    const record = entry as Record<string, unknown>;
    const category = record.category;
    if (typeof category !== "string" || !ALL_CATEGORIES.includes(category)) {
      return null;
    }
    const item = trimField(record.item);
    const quantity = trimField(record.quantity);
    if (!item || quantity === null) return null;
    // Objet reconstruit à partir de champs connus uniquement.
    items.push({ category, item, quantity });
  }
  return items;
}

// Renvoie la plage à remplacer : séparateur précédent (s'il existe),
// titre de section, puis uniquement les blocs de liste qui suivent.
function findOldListRange(blocks: AnyBlock[], headingIndex: number): AnyBlock[] {
  let start = headingIndex;
  if (headingIndex > 0 && blocks[headingIndex - 1].type === "divider") {
    start = headingIndex - 1;
  }
  let end = headingIndex + 1;
  while (end < blocks.length && LIST_BLOCK_TYPES.has(blocks[end].type)) {
    end++;
  }
  return blocks.slice(start, end);
}

function buildListBlocks(items: ShoppingItem[]): any[] {
  const groups = new Map<string, ShoppingItem[]>();
  for (const it of items) {
    const group = groups.get(it.category);
    if (group) group.push(it);
    else groups.set(it.category, [it]);
  }

  const blocks: any[] = [
    { object: "block", type: "divider", divider: {} },
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [
          {
            type: "text",
            text: {
              content: `🛒 ${SECTION_TITLE} — ${new Date().toLocaleDateString("fr-FR")}`,
            },
          },
        ],
      },
    },
  ];

  for (const [category, group] of groups) {
    blocks.push({
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [{ type: "text", text: { content: category } }],
      },
    });
    for (const it of group) {
      blocks.push({
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
    }
  }
  return blocks;
}

// Insère les blocs après `anchorId`, par lots de 100, en chaînant chaque lot
// sur le dernier bloc ajouté par le lot précédent.
async function appendAfter(
  blockId: string,
  children: any[],
  anchorId: string,
): Promise<void> {
  let after = anchorId;
  for (let i = 0; i < children.length; i += APPEND_CHUNK_SIZE) {
    const res = await notion.blocks.children.append({
      block_id: blockId,
      children: children.slice(i, i + APPEND_CHUNK_SIZE),
      after,
    });
    const last = res.results.at(-1);
    if (!last) throw new Error("Notion n'a renvoyé aucun bloc ajouté");
    after = last.id;
  }
}

function describeError(error: unknown) {
  if (error instanceof APIResponseError) {
    return { name: error.name, status: error.status, code: error.code };
  }
  if (error instanceof Error) return { name: error.name };
  return { name: "unknown" };
}

const badRequest = () =>
  NextResponse.json({ error: "Requête invalide." }, { status: 400 });

export async function POST(req: Request) {
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;

  if (!process.env.NOTION_API_KEY || !pageId) {
    return NextResponse.json(
      { error: "Configuration Notion incomplète." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest();
  }
  const items = parseItems(body);
  if (!items) return badRequest();

  try {
    const blocks = await listAllChildren(pageId);
    const headingIndex = blocks.findIndex(
      (b) => b.type === "heading_2" && plainText(b).includes(SECTION_TITLE),
    );
    if (headingIndex === -1) {
      return NextResponse.json(
        {
          error: `Titre « ${SECTION_TITLE} » introuvable sur la page Notion. Aucune modification effectuée.`,
        },
        { status: 422 },
      );
    }

    const oldRange = findOldListRange(blocks, headingIndex);
    const anchorId = oldRange[oldRange.length - 1].id;

    // 1. Ajouter la nouvelle liste juste après l'ancienne.
    await appendAfter(pageId, buildListBlocks(items), anchorId);

    // 2. Supprimer seulement l'ancienne liste, une fois la nouvelle en place.
    for (let i = 0; i < oldRange.length; i++) {
      if (i > 0) await sleep(DELETE_DELAY_MS);
      await notion.blocks.delete({ block_id: oldRange[i].id });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving to Notion:", describeError(error));
    return NextResponse.json(
      { error: "Impossible d'enregistrer la liste dans Notion." },
      { status: 502 },
    );
  }
}
