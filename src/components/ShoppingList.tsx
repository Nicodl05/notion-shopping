"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import AddItemForm, { type NewItemData } from "@/components/AddItemForm";
import { SUGGESTIONS_CATEGORY, getCategoryIcon } from "@/lib/categories";
import {
  getItemId,
  getSuggestionId,
  groupItems,
  isGuessed,
} from "@/lib/shoppingItems";
import type { ShoppingItem } from "@/types/shopping";

const SESSION_STORAGE_KEY = "notion-shopping:shopping-list";

type PersistedShoppingListState = {
  generationId: number;
  checkedItems: Record<string, boolean>;
  expandedItems: Record<string, boolean>;
  collapsedCategories: Record<string, boolean>;
  customItems: ShoppingItem[];
  customIdCounter: number;
};

type InitialShoppingListState = Omit<PersistedShoppingListState, "generationId">;

/**
 * Lit l'état persistant une seule fois, au montage. Coches et dépliages ne
 * sont restaurés que pour la génération à laquelle ils appartiennent.
 */
const readInitialState = (generationId: number): InitialShoppingListState => {
  const empty: InitialShoppingListState = {
    checkedItems: {},
    expandedItems: {},
    collapsedCategories: {},
    customItems: [],
    customIdCounter: 0,
  };
  if (typeof window === "undefined") return empty;

  let persisted: Partial<PersistedShoppingListState> | null;
  try {
    const rawState = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!rawState) return empty;
    persisted = JSON.parse(rawState) as Partial<PersistedShoppingListState> | null;
  } catch {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return empty;
  }
  if (!persisted) return empty;

  const sameGeneration = persisted.generationId === generationId;
  return {
    checkedItems: (sameGeneration && persisted.checkedItems) || {},
    expandedItems: (sameGeneration && persisted.expandedItems) || {},
    collapsedCategories: persisted.collapsedCategories ?? {},
    customItems: persisted.customItems ?? [],
    customIdCounter: persisted.customIdCounter ?? 0,
  };
};

export default function ShoppingList({
  items: rawItems,
  generationId,
}: {
  items: ShoppingItem[];
  generationId: number;
}) {
  const [initial] = useState(() => readInitialState(generationId));

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(
    initial.checkedItems,
  );
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    initial.expandedItems,
  );
  const [collapsedCategories, setCollapsedCategories] = useState<
    Record<string, boolean>
  >(initial.collapsedCategories);
  const [customItems, setCustomItems] = useState<ShoppingItem[]>(
    initial.customItems,
  );
  const customIdCounterRef = useRef(initial.customIdCounter);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const persisted: PersistedShoppingListState = {
      generationId,
      checkedItems,
      expandedItems,
      collapsedCategories,
      customItems,
      customIdCounter: customIdCounterRef.current,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(persisted));
  }, [generationId, checkedItems, expandedItems, collapsedCategories, customItems]);

  const items = useMemo(
    () => [...groupItems(rawItems), ...customItems],
    [rawItems, customItems],
  );
  const mainItems = useMemo(
    () => items.filter((it) => it.category !== SUGGESTIONS_CATEGORY),
    [items],
  );
  const suggestions = useMemo(
    () => items.filter((it) => it.category === SUGGESTIONS_CATEGORY),
    [items],
  );
  const mainCategories = useMemo(
    () => Array.from(new Set(mainItems.map((it) => it.category))),
    [mainItems],
  );

  const toggleCheck = (id: string) =>
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleExpand = (id: string) =>
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleCategory = (cat: string) =>
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));

  const handleAddItem = ({ name, quantity, category }: NewItemData) => {
    customIdCounterRef.current += 1;
    const customId = `custom-${customIdCounterRef.current}`;
    setCustomItems((prev) => [
      ...prev,
      { category, item: name, quantity, isCustom: true, customId },
    ]);
    setShowAddForm(false);
  };

  const handleRemoveCustomItem = (customId: string) => {
    setCustomItems((prev) => prev.filter((it) => it.customId !== customId));
  };

  const handleResetPersistedState = () => {
    setCheckedItems({});
    setExpandedItems({});
    setCollapsedCategories({});
    setCustomItems([]);
    setShowAddForm(false);
    customIdCounterRef.current = 0;
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  };

  const totalCount = mainItems.length;
  const checkedCount = mainItems.filter(
    (it) => checkedItems[getItemId(it)],
  ).length;
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;
  const guessedCount = mainItems.filter((it) => isGuessed(it.quantity)).length;

  if (items.length === 0) return null;

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-[#1A1A1A]">Liste de courses</h2>
        {(Object.keys(checkedItems).length > 0 || customItems.length > 0) && (
          <button
            type="button"
            onClick={handleResetPersistedState}
            className="text-xs font-semibold text-gray-600 hover:text-[#1A1A1A] transition-colors"
          >
            Réinitialiser la liste
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-3 text-sm">
          <span className="text-gray-600 font-medium">
            {checkedCount}/{totalCount}{" "}
            <span className="hidden xs:inline">articles</span>
            {guessedCount > 0 && (
              <span className="ml-2 text-orange-700">
                · {guessedCount} estimés
              </span>
            )}
          </span>
          <span className="text-[#4a7458] font-semibold">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#5C8C6A] rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {mainCategories.map((cat) => {
          const isCollapsed = !!collapsedCategories[cat];
          const catItems = mainItems.filter((it) => it.category === cat);
          return (
            <div
              key={cat}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full lg:h-auto"
            >
              <button
                type="button"
                aria-expanded={!isCollapsed}
                onClick={() => toggleCategory(cat)}
                className="w-full text-left flex items-center gap-2 px-4 py-3 border-b border-gray-50 bg-[#FBFBFA] cursor-pointer hover:bg-gray-100/50 transition-colors"
              >
                <span className="text-lg" aria-hidden="true">
                  {getCategoryIcon(cat)}
                </span>
                <span className="font-bold text-[#1A1A1A] text-sm truncate">
                  {cat}
                </span>
                <span className="ml-auto text-[10px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-full">
                  {catItems.length}
                </span>
                <svg
                  width="10"
                  height="6"
                  viewBox="0 0 10 6"
                  fill="none"
                  aria-hidden="true"
                  className={`ml-1 transition-transform duration-300 ${isCollapsed ? "-rotate-90" : ""}`}
                >
                  <path
                    d="M1 1L5 5L9 1"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {!isCollapsed && (
                <div className="divide-y divide-gray-50 flex-1">
                  {catItems.map((it) => {
                    const id = getItemId(it);
                    const customId = it.customId;
                    return (
                      <ShoppingRow
                        key={id}
                        item={it}
                        checked={!!checkedItems[id]}
                        expanded={!!expandedItems[id]}
                        onToggleCheck={() => toggleCheck(id)}
                        onToggleExpand={() => toggleExpand(id)}
                        onRemove={
                          it.isCustom && customId
                            ? () => handleRemoveCustomItem(customId)
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2">
        {showAddForm ? (
          <AddItemForm
            onAdd={handleAddItem}
            onCancel={() => setShowAddForm(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-gray-200 text-gray-600 hover:border-[#5C8C6A] hover:text-[#4a7458] transition-all duration-200 font-semibold text-sm bg-white/50 hover:bg-[#F4FAF6]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Ajouter un article
          </button>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-10 pt-6 border-t border-gray-200/60">
          <button
            type="button"
            aria-expanded={!collapsedCategories[SUGGESTIONS_CATEGORY]}
            onClick={() => toggleCategory(SUGGESTIONS_CATEGORY)}
            className="w-full text-left flex items-center justify-between mb-4 px-1 cursor-pointer group"
          >
            <span className="flex items-center gap-2">
              <span className="text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
                <span className="text-2xl" aria-hidden="true">🐱</span> Conseils du Chat
              </span>
              <span className="text-[10px] font-bold text-orange-800 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
                {suggestions.length} SUGGESTIONS
              </span>
            </span>
            <svg
              width="12"
              height="8"
              viewBox="0 0 10 6"
              fill="none"
              aria-hidden="true"
              className={`transition-transform duration-300 ${collapsedCategories[SUGGESTIONS_CATEGORY] ? "-rotate-90" : ""} text-gray-600 group-hover:text-orange-800`}
            >
              <path
                d="M1 1L5 5L9 1"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {!collapsedCategories[SUGGESTIONS_CATEGORY] && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {suggestions.map((it, idx) => {
                const id = getSuggestionId(idx);
                const checked = !!checkedItems[id];
                return (
                  <div
                    key={id}
                    role="checkbox"
                    aria-checked={checked}
                    tabIndex={0}
                    onClick={() => toggleCheck(id)}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        toggleCheck(id);
                      }
                    }}
                    className={`relative p-5 rounded-3xl border-2 transition-all duration-400 cursor-pointer overflow-hidden group ${
                      checked
                        ? "bg-gray-50 border-gray-100 opacity-60"
                        : "bg-[#FFFDF8] border-[#F2EADA] hover:border-[#D4A373] hover:shadow-md active:scale-[0.98]"
                    }`}
                  >
                    <div className="relative flex gap-4 z-10">
                      <div
                        aria-hidden="true"
                        className={`shrink-0 w-6 h-6 mt-1 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                          checked
                            ? "bg-[#D4A373] border-[#D4A373] scale-105"
                            : "border-[#E8DAB7] group-hover:border-[#D4A373]"
                        }`}
                      >
                        {checked && (
                          <svg width="11" height="9" viewBox="0 0 10 8" fill="none">
                            <path
                              d="M1 4L3.5 6.5L9 1"
                              stroke="white"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <span
                            className={`text-[15px] font-bold leading-tight ${checked ? "line-through text-gray-500" : "text-[#1A1A1A]"}`}
                          >
                            {it.item}
                          </span>
                        </div>
                        <p
                          className={`text-xs leading-relaxed mb-3 ${checked ? "text-gray-500" : "text-gray-600 font-medium"}`}
                        >
                          {it.quantity}
                        </p>
                        {it.recipes && (
                          <div className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-[#D4A373]" aria-hidden="true"></span>
                            <p
                              className={`text-[10px] font-bold uppercase tracking-wider ${checked ? "text-gray-500" : "text-amber-800"}`}
                            >
                              {it.recipes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    {!checked && (
                      <div className="absolute top-0 right-0 p-3" aria-hidden="true">
                        <div className="w-8 h-8 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center text-orange-200 rotate-12 opacity-40 group-hover:opacity-100 transition-opacity">
                          ✨
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type ShoppingRowProps = {
  item: ShoppingItem;
  checked: boolean;
  expanded: boolean;
  onToggleCheck: () => void;
  onToggleExpand: () => void;
  onRemove?: () => void;
};

function ShoppingRow({
  item,
  checked,
  expanded,
  onToggleCheck,
  onToggleExpand,
  onRemove,
}: ShoppingRowProps) {
  const hasRecipes = !!item.recipes && item.recipes !== "Général";
  const hasDetails = hasRecipes || !!item.quantityDetail;
  const guessed = isGuessed(item.quantity);

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-start gap-3 px-4 py-4 hover:bg-gray-50/50 transition-colors group select-none">
        {/* Zone tactile de 44 px ; les marges négatives gardent la mise en page d'origine. */}
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={item.item}
          onClick={onToggleCheck}
          className="shrink-0 -mx-2.5 -mb-2.5 -mt-2 w-11 h-11 flex items-center justify-center cursor-pointer"
        >
          <span
            aria-hidden="true"
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
              checked
                ? "bg-[#5C8C6A] border-[#5C8C6A] scale-105 shadow-sm"
                : "border-gray-200 group-hover:border-[#5C8C6A]"
            }`}
          >
            {checked && (
              <svg width="11" height="9" viewBox="0 0 10 8" fill="none">
                <path
                  d="M1 4L3.5 6.5L9 1"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        </button>

        <div className="flex-1 min-w-0 pr-1">
          <span
            className={`text-[14px] xs:text-[15px] font-semibold block leading-tight xs:leading-snug transition-all duration-300 ${
              checked
                ? "line-through text-gray-500 blur-[0.2px]"
                : "text-[#1A1A1A]"
            }`}
          >
            {item.item}
          </span>
          {hasDetails && (
            <button
              type="button"
              aria-expanded={expanded}
              onClick={onToggleExpand}
              className="flex items-center gap-1 mt-1 cursor-pointer w-fit"
            >
              <span
                className={`text-[10px] font-medium ${checked ? "text-gray-500" : "text-gray-600 group-hover:text-[#4a7458]"}`}
              >
                {expanded ? "Cacher les détails" : "Voir les détails"}
              </span>
              <svg
                width="8"
                height="6"
                viewBox="0 0 8 6"
                fill="none"
                aria-hidden="true"
                className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""} ${checked ? "opacity-40" : "opacity-60"}`}
              >
                <path
                  d="M1 1.5L4 4.5L7 1.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>

        {item.quantity && (
          <span
            className={`shrink-0 text-[11px] xs:text-xs px-2.5 py-1 rounded-lg font-bold tracking-tight shadow-sm self-start mt-0.5 pointer-events-none ${
              guessed
                ? "bg-orange-50 text-orange-700 border border-orange-100/50"
                : "bg-[#EAF3EC] text-[#4a7458] border border-[#D1E6D6]"
            }`}
          >
            {item.quantity}
          </span>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Supprimer ${item.item}`}
            title="Supprimer"
            className="shrink-0 ml-1 w-5 h-5 flex items-center justify-center rounded-full text-gray-500 hover:text-red-700 hover:bg-red-50 transition-all self-start mt-1"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {expanded && hasDetails && (
        <div className="px-12 pb-4">
          <div
            className={`text-[11px] font-medium leading-relaxed p-2 rounded-xl bg-gray-50/50 border border-gray-100/50 space-y-1 ${checked ? "text-gray-500" : "text-gray-600"}`}
          >
            {item.quantityDetail && (
              <p className="border-b border-gray-100 pb-1 mb-1">
                ⚖️ Détails : {item.quantityDetail}
              </p>
            )}
            {hasRecipes && <p>🥣 {item.recipes}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
