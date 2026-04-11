"use client";

import { ShoppingItem } from "@/app/types";

interface ShoppingListProps {
  items: ShoppingItem[];
  onToggle: (index: number) => void;
}

function groupByCategory(items: ShoppingItem[]): Map<string, { item: ShoppingItem; index: number }[]> {
  const map = new Map<string, { item: ShoppingItem; index: number }[]>();
  items.forEach((item, index) => {
    const existing = map.get(item.category) ?? [];
    existing.push({ item, index });
    map.set(item.category, existing);
  });
  return map;
}

export default function ShoppingList({ items, onToggle }: ShoppingListProps) {
  const grouped = groupByCategory(items);

  if (items.length === 0) {
    return (
      <p className="text-gray-400 italic text-sm">
        Aucun article détecté dans le contenu Notion.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([category, categoryItems]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {category}
          </h3>
          <ul className="space-y-2">
            {categoryItems.map(({ item, index }) => (
              <li key={index} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`item-${index}`}
                  checked={item.checked ?? false}
                  onChange={() => onToggle(index)}
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                />
                <label
                  htmlFor={`item-${index}`}
                  className={`flex-1 cursor-pointer text-gray-800 ${
                    item.checked ? "line-through text-gray-400" : ""
                  }`}
                >
                  {item.item}
                  {item.quantity && (
                    <span className="text-gray-400 text-sm ml-1">
                      — {item.quantity}
                    </span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
