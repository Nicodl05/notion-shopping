import { NextResponse } from "next/server";
import {
  extractPropertyText,
  findPrimaryPageName,
  isIngredientProperty,
} from "@/lib/notion";

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

const getRelatedRecipeId = (props: Record<string, any>) => {
  const relationEntry = Object.entries(props).find(([, prop]) => prop?.type === "relation");
  const relation = relationEntry?.[1]?.relation;
  if (!Array.isArray(relation) || relation.length === 0) return "";
  return relation[0]?.id || "";
};


export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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
    const props = page.properties || {};
    const relatedRecipeId = getRelatedRecipeId(props);

    let recipePage = page;
    let recipeProps = props;

    if (relatedRecipeId) {
      const relatedRes = await notionRequest(`/pages/${relatedRecipeId}`);
      if (relatedRes.ok) {
        recipePage = await relatedRes.json();
        recipeProps = recipePage.properties || {};
      }
    }

    // Extract recipe name
    const primaryName = findPrimaryPageName(recipeProps);
    const name = primaryName.name;

    // Extract URL from title if it has a link
    let recipeUrl = "";
    if ((recipeProps?.[primaryName.sourceProperty] as any)?.title?.[0]?.href) {
      recipeUrl = (recipeProps[primaryName.sourceProperty] as any).title[0].href;
    } else if ((recipeProps as any)?.URL?.url) {
      recipeUrl = (recipeProps as any).URL.url;
    } else if (recipePage.url) {
      recipeUrl = recipePage.url;
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
    const ingredientEntries = Object.entries(recipeProps).filter(([n]) =>
      isIngredientProperty(n),
    );

    const ingredients = ingredientEntries
      .map(([colName, prop]) => ({
        name: colName,
        value: extractPropertyText(prop as any),
      }))
      .filter((ing) => ing.value);

    // Extract all other properties
    const otherProperties = Object.entries(recipeProps)
      .filter(
        ([name, prop]: any) =>
          prop.type !== "title" &&
          prop.type !== "date" &&
          !isIngredientProperty(name),
      )
      .map(([name, prop]: any) => ({
        name,
        type: prop.type,
        value: extractPropertyText(prop),
      }))
      .filter((p) => p.value);

    return NextResponse.json({
      id: relatedRecipeId || page.id,
      name,
      url: recipeUrl,
      dateLabel,
      dateValue: dateVal,
      ingredients,
      otherProperties,
      hasTitle: primaryName.hasTitle || name !== "Sans nom",
    });
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipe" },
      { status: 500 },
    );
  }
}
