import { NextResponse } from "next/server";

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

export async function GET() {
  const pageId = getSafeId(process.env.NOTION_PAGE_ID || "");

  if (!process.env.NOTION_API_KEY || !pageId) {
    return NextResponse.json(
      { error: "Notion API key or Page ID missing" },
      { status: 500 },
    );
  }

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

      const rows = data.results.map((page: any) => {
        const props = page.properties;

        const nameProp: any =
          props.Nom ||
          props.Name ||
          Object.values(props).find((p: any) => p.type === "title");
        const name = nameProp?.title?.[0]?.plain_text || "Sans nom";

        const dateVal: string = datePropName
          ? props[datePropName]?.date?.start || ""
          : "";
        const dateLabel = dateVal
          ? new Date(dateVal).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })
          : "";

        const ingredientEntries = Object.entries(props).filter(
          ([n]) =>
            n.toLowerCase().includes("ingrédient") ||
            n.toLowerCase().includes("ingredient") ||
            n.includes("\u03a3"),
        );

        const extractText = (prop: any): string => {
          if (!prop) return "";
          if (prop.type === "rich_text")
            return prop.rich_text.map((t: any) => t.plain_text).join("");
          if (prop.type === "formula") return prop.formula.string || "";
          if (prop.type === "rollup")
            return (
              prop.rollup.array
                ?.map(
                  (item: any) =>
                    item.rich_text?.map((t: any) => t.plain_text).join("") ||
                    "",
                )
                .join(", ") || ""
            );
          return "";
        };

        const ingreds = ingredientEntries
          .map(([colName, prop]) => {
            const text = extractText(prop as any);
            return text ? `[${colName}] ${text}` : "";
          })
          .filter(Boolean)
          .join("\n");

        return `${dateLabel ? `[${dateLabel}] ` : ""}Recette: ${name}${ingreds ? ` | Ingrédients: ${ingreds}` : ""}`;
      });

      return NextResponse.json({
        content: "PLANNING DE LA SEMAINE:\n\n" + rows.join("\n\n"),
        blocks: data.results,
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
            const name =
              page.properties?.Nom?.title?.[0]?.plain_text ||
              page.properties?.Name?.title?.[0]?.plain_text ||
              "Plat";
            parts.push(`- ${name}`);
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
}
