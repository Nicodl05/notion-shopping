"use client";
import React, { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import type { Recipe } from "@/types/shopping";

interface PlannedRecipe {
  key: string;
  name: string;
  id: string;
  hasTitle: boolean;
}

interface DayPlan {
  date: string;
  recipes: PlannedRecipe[];
}

/**
 * Construit le planning. Quand l'API fournit la liste des recettes, chaque
 * entrée porte son propre identifiant et son nom : on ne s'appuie plus sur
 * l'ordre des lignes du texte. Le texte n'est lu qu'en secours.
 */
function buildDays(content: string, recipes?: Recipe[]): DayPlan[] {
  if (recipes && recipes.length > 0) {
    return recipes.map((recipe, index) => ({
      date: recipe.dateLabel || "Planning",
      recipes: [
        {
          key: recipe.id || `recipe-${index}`,
          name: recipe.name || "Recette sans titre",
          id: recipe.id,
          hasTitle: recipe.hasTitle,
        },
      ],
    }));
  }

  if (!content) return [];

  // Secours : seules les lignes « [date] Recette: nom » ou « Recette: nom » comptent.
  // Les lignes d'ingrédients (« [Colonne] valeur ») sont ignorées.
  const days: DayPlan[] = [];
  for (const line of content.split("\n")) {
    const match = line
      .trim()
      .match(/^(?:\[([^\]]+)\]\s*)?Recette:\s*(.+?)(?:\s*\|.*)?$/);
    if (!match) continue;
    days.push({
      date: match[1] ?? "Planning",
      recipes: [
        {
          key: `line-${days.length}`,
          name: match[2].trim() || "Recette sans titre",
          id: "",
          hasTitle: true,
        },
      ],
    });
  }
  return days;
}

export default function NotionContent({
  content,
  recipes,
}: {
  content: string;
  recipes?: Recipe[];
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const days = buildDays(content, recipes);
  const hasData = days.length > 0;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="font-semibold text-[#1A1A1A] text-sm">
            Planning de la semaine
          </span>
          {hasData && (
            <span className="text-xs text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">
              {days.length} repas
            </span>
          )}
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`text-gray-600 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div id={panelId} className="border-t border-gray-50 px-5 py-4">
          {hasData ? (
            <div className="space-y-3">
              {days.map((day, i) => (
                <div key={`${day.date}-${i}`} className="flex gap-3 items-start">
                  <span className="shrink-0 text-xs font-semibold bg-[#EAF3EC] text-[#4a7458] rounded-xl px-3 py-1.5 capitalize leading-tight">
                    {day.date}
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {day.recipes.map((r) => (
                      <div key={r.key}>
                        {r.id ? (
                          <Link
                            href={`/recipe/${r.id}`}
                            className="inline-block text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1 hover:bg-[#EAF3EC] hover:text-[#4a7458] hover:border-[#5C8C6A] transition-all cursor-pointer"
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
                              <span className="ml-1 text-amber-700" aria-label="Titre non renseigné">
                                ⚠️
                              </span>
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
            <div className="text-gray-600 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto font-mono text-xs">
              {content || "Aucun contenu Notion chargé."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
