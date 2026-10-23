/**
 * POST /api/generate : transforme le planning Notion en liste de courses (JSON).
 *
 * Variables d'environnement :
 * - MISTRAL_API_KEY (obligatoire) : clé de l'API Mistral. Absente => 503.
 * - MISTRAL_MODEL (optionnelle) : modèle de chat Mistral. Défaut : "mistral-small-latest".
 *
 * Entrée : { "content": string } (planning, 8 000 caractères max).
 * Sortie : { "items": [{ category, item, quantity, recipes, reason }] }.
 */
export const runtime = "nodejs";

import { Mistral } from "@mistralai/mistralai";
import { MistralError } from "@mistralai/mistralai/models/errors";
import { NextResponse } from "next/server";
import { DEFAULT_CUSTOM_CATEGORY } from "@/lib/categories";
import {
  MAX_PLANNING_LENGTH,
  OUTPUT_CATEGORIES,
  SHOPPING_LIST_JSON_SCHEMA,
  SHOPPING_LIST_SYSTEM_PROMPT,
  buildShoppingListUserMessage,
} from "@/lib/prompt";
import { requireApiSession } from "@/lib/session";

const DEFAULT_MODEL = "mistral-small-latest";
const REQUEST_TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 1_000;
const MAX_OUTPUT_TOKENS = 4096;

const KNOWN_CATEGORIES = new Set<string>(OUTPUT_CATEGORIES);

type ShoppingItem = {
  category: string;
  item: string;
  quantity: string;
  recipes: string;
  reason: string;
};

/** Erreur attendue, dont le message est sûr à renvoyer au client. */
class GenerateError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "GenerateError";
  }
}

const PROVIDER_UNAVAILABLE =
  "Le service de génération est indisponible. Réessayez dans un instant.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Extrait le texte de content, qui peut être une chaîne ou un tableau de blocs. */
function extractText(content: unknown): string | null {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((chunk: unknown) =>
        isRecord(chunk) && chunk.type === "text" && typeof chunk.text === "string"
          ? chunk.text
          : "",
      )
      .join("");
  }
  return null;
}

/** Valide la sortie JSON du modèle. Renvoie null si la forme est invalide. */
function parseModelOutput(text: string): ShoppingItem[] | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(data) || !Array.isArray(data.items)) return null;

  const items: ShoppingItem[] = [];
  for (const raw of data.items as unknown[]) {
    if (!isRecord(raw)) continue;
    const product = asTrimmedString(raw.product);
    if (!product) continue;

    const rawCategory = asTrimmedString(raw.category);
    // Catégorie hors liste fermée : ramenée à la catégorie par défaut.
    const category = KNOWN_CATEGORIES.has(rawCategory)
      ? rawCategory
      : DEFAULT_CUSTOM_CATEGORY;

    items.push({
      category,
      item: product,
      quantity: asTrimmedString(raw.quantity),
      recipes: asTrimmedString(raw.recipes),
      reason: asTrimmedString(raw.reason),
    });
  }
  return items;
}

/** Erreur transitoire : réseau, timeout, 429 ou 5xx. */
function isTransientError(error: unknown): boolean {
  if (error instanceof MistralError) {
    return error.statusCode === 429 || error.statusCode >= 500;
  }
  return (
    error instanceof Error &&
    (error.name === "ConnectionError" || error.name === "RequestTimeoutError")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ChatArgs = Parameters<Mistral["chat"]["complete"]>[0];

/** Appel Mistral avec timeout, sans retry SDK, et au plus un retry applicatif. */
async function callMistral(client: Mistral, args: ChatArgs) {
  const options = {
    timeoutMs: REQUEST_TIMEOUT_MS,
    retries: { strategy: "none" as const },
  };
  try {
    return await client.chat.complete(args, options);
  } catch (error) {
    if (!isTransientError(error)) throw error;
    await sleep(RETRY_DELAY_MS);
    return client.chat.complete(args, options);
  }
}

async function generateShoppingList(
  apiKey: string,
  planning: string,
): Promise<ShoppingItem[]> {
  const client = new Mistral({ apiKey });
  const model = process.env.MISTRAL_MODEL?.trim() || DEFAULT_MODEL;

  let response: Awaited<ReturnType<typeof callMistral>>;
  try {
    response = await callMistral(client, {
      model,
      messages: [
        { role: "system", content: SHOPPING_LIST_SYSTEM_PROMPT },
        { role: "user", content: buildShoppingListUserMessage(planning) },
      ],
      temperature: 0.1,
      maxTokens: MAX_OUTPUT_TOKENS,
      responseFormat: {
        type: "json_schema",
        jsonSchema: {
          name: "shopping_list",
          schemaDefinition: SHOPPING_LIST_JSON_SCHEMA,
          strict: true,
        },
      },
    });
  } catch (error) {
    console.error("[api/generate] Échec du fournisseur Mistral", {
      name: error instanceof Error ? error.name : "unknown",
      status: error instanceof MistralError ? error.statusCode : undefined,
    });
    throw new GenerateError(502, PROVIDER_UNAVAILABLE);
  }

  const choice = response.choices?.[0];
  if (!choice) {
    console.error("[api/generate] Réponse Mistral sans choix");
    throw new GenerateError(502, PROVIDER_UNAVAILABLE);
  }

  if (choice.finishReason === "length" || choice.finishReason === "model_length") {
    console.error("[api/generate] Sortie Mistral tronquée", {
      finishReason: choice.finishReason,
    });
    throw new GenerateError(
      502,
      "La réponse est trop longue pour être traitée. Réduisez le planning et réessayez.",
    );
  }

  const text = extractText(choice.message?.content);
  if (text === null) {
    console.error("[api/generate] Contenu Mistral non textuel");
    throw new GenerateError(502, PROVIDER_UNAVAILABLE);
  }

  const items = parseModelOutput(text);
  if (items === null) {
    // Ne pas loguer la sortie brute du modèle.
    console.error("[api/generate] Sortie Mistral invalide (JSON attendu)");
    throw new GenerateError(502, PROVIDER_UNAVAILABLE);
  }
  return items;
}

export async function POST(req: Request) {
  const unauthorized = await requireApiSession();
  if (unauthorized) return unauthorized;

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    console.error("[api/generate] MISTRAL_API_KEY non configurée");
    return NextResponse.json(
      { error: "Service de génération non configuré." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const content = isRecord(body) ? body.content : undefined;
  if (typeof content !== "string" || content.trim() === "") {
    return NextResponse.json(
      { error: "Le contenu du planning est requis." },
      { status: 400 },
    );
  }
  if (content.length > MAX_PLANNING_LENGTH) {
    return NextResponse.json(
      { error: "Le planning est trop volumineux." },
      { status: 413 },
    );
  }

  try {
    const items = await generateShoppingList(apiKey, content.trim());
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof GenerateError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/generate] Erreur inattendue", {
      name: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 },
    );
  }
}
