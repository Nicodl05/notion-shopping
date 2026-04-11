"use client";
import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

interface DayPlan {
  date: string;
  recipes: string[];
}

function parsePlanning(content: string): DayPlan[] {
  if (!content) return [];

  const days: DayPlan[] = [];
  const lines = content.split("\n").filter((l) => l.trim());
  let current: DayPlan | null = null;

  for (const line of lines) {
    const dayMatch = line.match(/\[([^\]]+)\]/);
    if (dayMatch) {
      if (current) days.push(current);
      const rest = line.replace(dayMatch[0], "").trim();
      const recipeMatch = rest.match(/Recette:\s*(.+?)(?:\s*\|.*)?$/);
      current = {
        date: dayMatch[1],
        recipes: recipeMatch ? [recipeMatch[1].trim()] : [],
      };
    } else if (line.startsWith("Recette:")) {
      const name = line.replace("Recette:", "").split("|")[0].trim();
      if (!current) current = { date: "Planning", recipes: [] };
      if (name && name !== "Sans nom") current.recipes.push(name);
    }
  }
  if (current) days.push(current);

  return days.filter((d) => d.recipes.length > 0);
}

export default function NotionContent({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  const days = parsePlanning(content);
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
                      <span
                        key={j}
                        className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1"
                      >
                        {r}
                      </span>
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
