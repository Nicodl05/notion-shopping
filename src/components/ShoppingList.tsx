"use client";
import React, { useState } from "react";

interface ShoppingItem {
  category: string;
  item: string;
  quantity: string;
  recipes?: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  "Fruits & Légumes": "🥦",
  "Viandes & Charcuterie": "🥩",
  "Poissons & Fruits de mer": "🐟",
  Poissons: "🐟",
  "Produits laitiers & Œufs": "🧀",
  "Produits laitiers": "🧀",
  "Épicerie sèche": "🧂",
  Conserves: "🫙",
  "Boulangerie & Pâtisserie": "🥐",
  Boulangerie: "🥐",
  Surgelés: "❄️",
  "Boissons & Condiments": "🧃",
  Boissons: "🧃",
  Condiments: "🧃",
};

const getCategoryIcon = (cat: string) => CATEGORY_ICONS[cat] ?? "🛒";

const isGuessed = (quantity: string) => !quantity || !/\d/.test(quantity);

export default function ShoppingList({ items }: { items: ShoppingItem[] }) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const categories = Array.from(new Set(items.map((it) => it.category)));
  const totalCount = items.length;
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const guessedCount = items.filter((it) => isGuessed(it.quantity)).length;
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  if (items.length === 0) return null;

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-xl font-bold text-[#1A1A1A]">Liste de courses</h2>

      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-3 text-sm">
          <span className="text-gray-500 font-medium">
            {checkedCount}/{totalCount} articles
            {guessedCount > 0 && (
              <span className="ml-2 text-orange-400">
                · {guessedCount} estimés
              </span>
            )}
          </span>
          <span className="text-[#5C8C6A] font-semibold">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#5C8C6A] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {categories.map((cat, catIdx) => (
          <div
            key={cat}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            style={{ animationDelay: `${catIdx * 60}ms` }}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
              <span className="text-lg">{getCategoryIcon(cat)}</span>
              <span className="font-semibold text-[#1A1A1A] text-sm">
                {cat}
              </span>
              <span className="ml-auto text-xs text-gray-400">
                {items.filter((it) => it.category === cat).length} articles
              </span>
            </div>

            <div className="divide-y divide-gray-50">
              {items
                .filter((it) => it.category === cat)
                .map((it, idx) => {
                  const id = `${cat}-${idx}`;
                  const checked = !!checkedItems[id];
                  const guessed = isGuessed(it.quantity);
                  return (
                    <div
                      key={id}
                      onClick={() => toggleCheck(id)}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors group"
                    >
                      <div
                        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                          checked
                            ? "bg-[#5C8C6A] border-[#5C8C6A] scale-110"
                            : "border-gray-300 group-hover:border-[#5C8C6A]"
                        }`}
                      >
                        {checked && (
                          <svg
                            width="10"
                            height="8"
                            viewBox="0 0 10 8"
                            fill="none"
                          >
                            <path
                              d="M1 4L3.5 6.5L9 1"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-sm font-medium transition-colors duration-200 ${
                            checked
                              ? "line-through text-gray-300"
                              : "text-[#1A1A1A]"
                          }`}
                        >
                          {it.item}
                        </span>
                        {it.recipes && it.recipes !== "Général" && (
                          <p
                            className={`text-xs mt-0.5 truncate transition-colors duration-200 ${
                              checked ? "text-gray-200" : "text-gray-400"
                            }`}
                          >
                            {it.recipes}
                          </p>
                        )}
                      </div>

                      {it.quantity && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            guessed
                              ? "bg-[#FFF0E0] text-orange-500"
                              : "bg-[#EAF3EC] text-[#5C8C6A]"
                          }`}
                        >
                          {it.quantity}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
