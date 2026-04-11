import { Mistral } from "@mistralai/mistralai";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { SHOPPING_LIST_PROMPT } from "@/lib/prompt";

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY || "",
});

export async function POST(req: Request) {
  if (!process.env.MISTRAL_API_KEY) {
    return NextResponse.json(
      { error: "Mistral API key missing" },
      { status: 500 },
    );
  }

  try {
    const { content } = await req.json();

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 },
      );
    }

    const prompt = SHOPPING_LIST_PROMPT.replace("{{PLANNING}}", content);

    const response = await mistral.chat.complete({
      model: "open-mistral-7b",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful culinary assistant. Always output in the requested pipe-separated format.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1, // Lower temperature for more consistent structured output
    });

    const text = (response.choices?.[0]?.message?.content as string) || "";
    console.log("Mistral Raw Output:", text);

    // Parser le format "Catégorie | Produit | Quantité | Recettes"
    const lines = text.split("\n").filter((l: string) => l.includes("|"));
    const items = lines
      .map((line: string) => {
        const parts = line.split("|").map((p: string) => p.trim());
        return {
          category: parts[0] || "Divers",
          item: parts[1] || "",
          quantity: parts[2] || "",
          recipes: parts[3] || "",
        };
      })
      .filter((it: any) => it.item);

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error("Error calling Mistral:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
