import { NextResponse } from "next/server";
import {
  extractPropertyText,
  findPrimaryPageName,
  isIngredientProperty,
} from "@/lib/notion";

const NOTION_VERSION = "2022-06-28";

const getSafeId = (input: string) => {
  if (!input) return "";
  const clean = input.split("?")[0].replace(/-/g, "");
  return clean.length >= 32 ? clean.slice(-32) : clean;
};

async function notionRequest(path: string, method = "GET", body?: object) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

const getFirstRelationId = (props: Record<string, any>) => {
  const relationEntry = Object.entries(props).find(([, prop]) => prop?.type === "relation");
  const relation = relationEntry?.[1]?.relation;
  if (!Array.isArray(relation) || relation.length === 0) return "";
  return relation[0]?.id || "";
};

export async function GET() {
  const pageId = getSafeId(process.env.NOTION_PAGE_ID || "");

  if (!process.env.NOTION_API_KEY || !pageId) {
    return NextResponse.json(
      { error: "Notion API key or Page ID missing" },
      { status: 500 },
    );
  }

  try {
    const schemaRes = await notionRequest(`/databases/${pageId}`);
    if (schemaRes.ok) {
      const schema = await schemaRes.json();
      const props = schema.properties || {};

      const datePropEntry = Object.entries(props).find(
        ([, v]: any) => v.type === "date",
      );
      const datePropName = datePropEntry?.[0];

      const todayStr = new Date().toISOString().split("T")[0];
      const endStr = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const queryBody: any = datePropName
        ? {
            filter: {
              and: [
                { property: datePropName, date: { on_or_after: todayStr } },
                { property: datePropName, date: { before: endStr } },
              ],
            },
            sorts: [{ property: datePropName, direction: "ascending" }],
          }
        : {};

      const dbRes = await notionRequest(
        `/databases/${pageId}/query`,
        "POST",
        queryBody,
      );
      if (dbRes.ok) {
        const data = await dbRes.json();

        if (data.results.length === 0) {
          return NextResponse.json({ empty: true });
        }

        const recipes = data.results.map((page: any) => {
          const pageProps = page.properties || {};
          const primaryName = findPrimaryPageName(pageProps);
          const relatedRecipeId = getFirstRelationId(pageProps);
          const dateVal: string = datePropName
            ? pageProps[datePropName]?.date?.start || ""
            : "";
          const dateLabel = dateVal
            ? new Date(dateVal).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })
            : "";

          const ingredientEntries = Object.entries(pageProps).filter(([n]) =>
            isIngredientProperty(n),
          );

          const ingredientsData = ingredientEntries.map(([colName, prop]) => ({
            name: colName,
            value: extractPropertyText(prop as any),
          }));

          const ingreds = ingredientsData
            .filter((ing) => ing.value)
            .map((ing) => `[${ing.name}] ${ing.value}`)
            .join("\n");

          const titleHref = (pageProps?.[primaryName.sourceProperty] as any)
            ?.title?.[0]?.href;
          const recipeUrl = titleHref || page.url || "";

          return {
            id: relatedRecipeId || page.id,
            name: primaryName.name,
            dateLabel,
            dateValue: dateVal,
            ingredients: ingredientsData.filter((ing) => ing.value),
            textSummary: `${dateLabel ? `[${dateLabel}] ` : ""}Recette: ${primaryName.name}${ingreds ? ` | Ingrédients: ${ingreds}` : ""}`,
            url: recipeUrl,
            hasTitle: primaryName.hasTitle,
          };
        });

        const rows = recipes.map((r: any) => r.textSummary);

        return NextResponse.json({
          content: "PLANNING DE LA SEMAINE:\n\n" + rows.join("\n\n"),
          blocks: data.results,
          recipes,
        });
      }
    }

    const blocksRes = await notionRequest(`/blocks/${pageId}/children`);
    if (blocksRes.ok) {
      const data = await blocksRes.json();
      const blocks = data.results;
      const parts: string[] = [];

      for (const b of blocks) {
        const type: string = b.type;
        if (type === "child_database") {
          const subRes = await notionRequest(
            `/databases/${b.id}/query`,
            "POST",
            {},
          );
          if (subRes.ok) {
            const subData = await subRes.json();
            subData.results.forEach((page: any) => {
              const primaryName = findPrimaryPageName(page.properties || {});
              parts.push(`- ${primaryName.name}`);
            });
          }
        } else {
          const text = b[type]?.rich_text?.[0]?.plain_text || "";
          if (text) parts.push(text);
        }
      }

      return NextResponse.json({ content: parts.join("\n"), blocks });
    }

    return NextResponse.json(
      {
        error:
          "Contenu introuvable. Vérifiez l'ID et les accès de l'intégration.",
        id_tested: pageId,
      },
      { status: 404 },
    );
  } catch (error) {
    console.error("Error fetching Notion planning:", error);
    return NextResponse.json(
      { error: "Failed to fetch Notion planning" },
      { status: 500 },
    );
  }
}
