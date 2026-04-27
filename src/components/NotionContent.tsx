"use client";
import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import type { Recipe } from "@/types/shopping";

interface DayPlan {
  date: string;
  recipes: Array<{ name: string; id: string; hasTitle: boolean }>;
}

function parsePlanning(
  content: string,
  recipeData?: Recipe[],
): DayPlan[] {
  if (!content) return [];

  const days: DayPlan[] = [];
  const lines = content.split("\n").filter((l) => l.trim());
  let current: DayPlan | null = null;
  let recipeIndex = 0;

  for (const line of lines) {
    const dayMatch = line.match(/\[([^\]]+)\]/);
    if (dayMatch) {
      if (current) days.push(current);
      const rest = line.replace(dayMatch[0], "").trim();
      const recipeMatch = rest.match(/Recette:\s*(.+?)(?:\s*\|.*)?$/);
      const recipeName = recipeMatch ? recipeMatch[1].trim() : "";
      const recipe = recipeData?.[recipeIndex];
      current = {
        date: dayMatch[1],
        recipes:
          recipeName && recipeName !== "Sans nom"
            ? [
                {
                  name: recipeName,
                  id: recipe?.id || "",
                  hasTitle: recipe?.hasTitle ?? true,
                },
              ]
            : [],
      };
      if (recipeName) recipeIndex++;
    } else if (line.startsWith("Recette:")) {
      const name = line.replace("Recette:", "").split("|")[0].trim();
      if (!current) current = { date: "Planning", recipes: [] };
      const recipe = recipeData?.[recipeIndex];
      if (name && name !== "Sans nom") {
        current.recipes.push({
          name,
          id: recipe?.id || "",
          hasTitle: recipe?.hasTitle ?? true,
        });
        recipeIndex++;
      }
    }
  }
  if (current) days.push(current);

  return days.filter((d) => d.recipes.length > 0);
}

export default function NotionContent({
  content,
  recipes,
}: {
  content: string;
  recipes?: Recipe[];
}) {
  const [open, setOpen] = useState(false);
  const days = parsePlanning(content, recipes);
  const hasData = days.length > 0;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#1A1A1A] text-sm">
            Planning de la semaine
          </span>
          {hasData && (
            <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
              {days.length} repas
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-gray-50 px-5 py-4">
          {hasData ? (
            <div className="space-y-3">
              {days.map((day, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="shrink-0 text-xs font-semibold bg-[#EAF3EC] text-[#5C8C6A] rounded-xl px-3 py-1.5 capitalize leading-tight">
                    {day.date}
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {day.recipes.map((r, j) => (
                      <div key={j}>
                        {r.id && r.hasTitle ? (
                          <Link
                            href={`/recipe/${r.id}`}
                            className="inline-block text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1 hover:bg-[#EAF3EC] hover:text-[#5C8C6A] hover:border-[#5C8C6A] transition-all cursor-pointer"
                          >
                            {r.name}
                          </Link>
                        ) : (
                          <span
                            className="inline-block text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1"
                            title={
                              !r.hasTitle
                                ? "Titre non renseigné dans Notion"
                                : undefined
                            }
                          >
                            {r.name}
                            {!r.hasTitle && (
                              <span className="ml-1 text-amber-500">⚠️</span>
                            )}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-400 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto font-mono text-xs">
              {content || "Aucun contenu Notion chargé."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
