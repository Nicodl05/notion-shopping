import { NextResponse } from "next/server";

const NOTION_VERSION = "2022-06-28";

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
            item.rich_text?.map((t: any) => t.plain_text).join("") || "",
        )
        .join(", ") || ""
    );
  return "";
};

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  if (!process.env.NOTION_API_KEY) {
    return NextResponse.json(
      { error: "Notion API key missing" },
      { status: 500 },
    );
  }

  try {
    // Fetch the page details
    const pageRes = await notionRequest(`/pages/${id}`);
    if (!pageRes.ok) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 },
      );
    }

    const page = await pageRes.json();
    const props = page.properties;

    // Extract recipe name
    const nameProp: any =
      props.Nom ||
      props.Name ||
      Object.values(props).find((p: any) => p.type === "title");
    const name = nameProp?.title?.[0]?.plain_text || "Sans nom";

    // Extract URL from title if it has a link
    let recipeUrl = "";
    if (nameProp?.title?.[0]?.href) {
      recipeUrl = nameProp.title[0].href;
    } else if (page.url) {
      recipeUrl = page.url;
    }

    // Extract date
    const datePropEntry = Object.entries(props).find(
      ([, v]: any) => v.type === "date",
    );
    const datePropName = datePropEntry?.[0];
    const dateVal: string = datePropName
      ? (props[datePropName] as any)?.date?.start || ""
      : "";
    const dateLabel = dateVal
      ? new Date(dateVal).toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "";

    // Extract ingredients
    const ingredientEntries = Object.entries(props).filter(
      ([n]) =>
        n.toLowerCase().includes("ingrédient") ||
        n.toLowerCase().includes("ingredient") ||
        n.includes("\u03a3"),
    );

    const ingredients = ingredientEntries
      .map(([colName, prop]) => ({
        name: colName,
        value: extractText(prop as any),
      }))
      .filter((ing) => ing.value);

    // Extract all other properties
    const otherProperties = Object.entries(props)
      .filter(
        ([name, prop]: any) =>
          prop.type !== "title" &&
          prop.type !== "date" &&
          !name.toLowerCase().includes("ingrédient") &&
          !name.toLowerCase().includes("ingredient") &&
          !name.includes("\u03a3"),
      )
      .map(([name, prop]: any) => ({
        name,
        type: prop.type,
        value: extractText(prop),
      }))
      .filter((p) => p.value);

    return NextResponse.json({
      id: page.id,
      name,
      url: recipeUrl,
      dateLabel,
      dateValue: dateVal,
      ingredients,
      otherProperties,
      hasTitle: name !== "Sans nom",
    });
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipe" },
      { status: 500 },
    );
  }
}
