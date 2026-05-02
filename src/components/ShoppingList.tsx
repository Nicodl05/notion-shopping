"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  ALL_CATEGORIES,
  DEFAULT_CUSTOM_CATEGORY,
  SUGGESTIONS_CATEGORY,
  getCategoryIcon,
} from "@/lib/categories";
import type { ShoppingItem } from "@/types/shopping";

const isGuessed = (quantity: string) => !quantity || !/\d/.test(quantity);

const SESSION_STORAGE_KEY = "notion-shopping:shopping-list";

type PersistedShoppingListState = {
  checkedItems: Record<string, boolean>;
  expandedItems: Record<string, boolean>;
  collapsedCategories: Record<string, boolean>;
  customItems: ShoppingItem[];
  customIdCounter: number;
};

const readPersistedShoppingListState = (): Partial<PersistedShoppingListState> => {
  if (typeof window === "undefined") return {};

  try {
    const rawState = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!rawState) return {};
    return JSON.parse(rawState) as Partial<PersistedShoppingListState>;
  } catch {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return {};
  }
};


export default function ShoppingList({
  items: rawItems,
}: {
  items: ShoppingItem[];
}) {
  const persistedState = readPersistedShoppingListState();

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(
    () => persistedState.checkedItems ?? {},
  );
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    () => persistedState.expandedItems ?? {},
  );
  const [collapsedCategories, setCollapsedCategories] = useState<
    Record<string, boolean>
  >(() => persistedState.collapsedCategories ?? {});

  const customIdCounterRef = useRef(persistedState.customIdCounter ?? 0);

  const [customItems, setCustomItems] = useState<ShoppingItem[]>(
    () => persistedState.customItems ?? [],
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("");
  const [newItemCategory, setNewItemCategory] = useState(DEFAULT_CUSTOM_CATEGORY);
  const itemNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const persistedState: PersistedShoppingListState = {
      checkedItems,
      expandedItems,
      collapsedCategories,
      customItems,
      customIdCounter: customIdCounterRef.current,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(persistedState));
  }, [checkedItems, expandedItems, collapsedCategories, customItems]);

  useEffect(() => {
    if (showAddForm) {
      setTimeout(() => itemNameRef.current?.focus(), 50);
    }
  }, [showAddForm]);

  const handleAddItem = () => {
    const name = newItemName.trim();
    if (!name) return;
    customIdCounterRef.current += 1;
    const id = `custom-${customIdCounterRef.current}`;
    setCustomItems((prev) => [
      ...prev,
      {
        category: newItemCategory,
        item: name,
        quantity: newItemQty.trim(),
        isCustom: true,
        customId: id,
      },
    ]);
    setNewItemName("");
    setNewItemQty("");
    setShowAddForm(false);
  };

  const handleAddItemKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAddItem();
    if (e.key === "Escape") setShowAddForm(false);
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
    setNewItemName("");
    setNewItemQty("");
    setNewItemCategory(DEFAULT_CUSTOM_CATEGORY);
    customIdCounterRef.current = 0;
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  };

  // Group items by Category and Product Name to avoid duplicates if the AI fails to group
  const items = React.useMemo(() => {
    const grouped = rawItems.reduce((acc, current) => {
      if (current.category === SUGGESTIONS_CATEGORY) {
        acc.push(current);
        return acc;
      }

      const key = `${current.category}-${current.item.toLowerCase().trim()}`;
      const existing = acc.find(
        (it) => `${it.category}-${it.item.toLowerCase().trim()}` === key,
      );

      if (existing) {
        // Just refine quantity string to be clean
        const currentQty = current.quantity.trim();
        if (
          !existing.quantity.toLowerCase().includes(currentQty.toLowerCase())
        ) {
          // If we can parse numbers, we sum them
          const num1 = parseFloat(existing.quantity);
          const num2 = parseFloat(currentQty);
          if (!isNaN(num1) && !isNaN(num2)) {
            const unit1 = existing.quantity.replace(/[\d.,]/g, "").trim();
            const unit2 = currentQty.replace(/[\d.,]/g, "").trim();
            if (unit1 === unit2) {
              existing.quantity = `${num1 + num2}${unit1}`;
            } else {
              existing.quantity = `${existing.quantity} + ${currentQty}`;
            }
          } else {
            existing.quantity = `${existing.quantity} + ${currentQty}`;
          }
        }
        if (current.recipes && !existing.recipes?.includes(current.recipes)) {
          existing.recipes = existing.recipes
            ? `${existing.recipes}, ${current.recipes}`
            : current.recipes;
        }
      } else {
        acc.push({ ...current });
      }
      return acc;
    }, [] as ShoppingItem[]);
    return [...grouped, ...customItems];
  }, [rawItems, customItems]);

  const toggleCheck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const categories = Array.from(new Set(items.map((it) => it.category)));
  const mainCategories = categories.filter((c) => c !== SUGGESTIONS_CATEGORY);
  const suggestions = items.filter(
    (it) => it.category === SUGGESTIONS_CATEGORY,
  );

  const totalCount = items.filter(
    (it) => it.category !== SUGGESTIONS_CATEGORY,
  ).length;
  const checkedCount = Object.entries(checkedItems).filter(
    ([id, checked]) => checked && !id.startsWith("Suggestions du Chef-"),
  ).length;

  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;
  const guessedCount = items.filter(
    (it) => it.category !== SUGGESTIONS_CATEGORY && isGuessed(it.quantity),
  ).length;

  if (items.length === 0) return null;

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-[#1A1A1A]">Liste de courses</h2>
        {(Object.keys(checkedItems).length > 0 || customItems.length > 0) && (
          <button
            onClick={handleResetPersistedState}
            className="text-xs font-semibold text-gray-400 hover:text-[#1A1A1A] transition-colors"
          >
            Réinitialiser la liste
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-3 text-sm">
          <span className="text-gray-500 font-medium">
            {checkedCount}/{totalCount}{" "}
            <span className="hidden xs:inline">articles</span>
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
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#5C8C6A] rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {mainCategories.map((cat, catIdx) => {
          const isCollapsed = !!collapsedCategories[cat];
          return (
            <div
              key={cat}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full lg:h-auto"
              style={{ animationDelay: `${catIdx * 60}ms` }}
            >
              <div
                onClick={() => toggleCategory(cat)}
                className="flex items-center gap-2 px-4 py-3 border-b border-gray-50 bg-[#FBFBFA] cursor-pointer hover:bg-gray-100/50 transition-colors"
              >
                <span className="text-lg">{getCategoryIcon(cat)}</span>
                <span className="font-bold text-[#1A1A1A] text-sm truncate">
                  {cat}
                </span>
                <span className="ml-auto text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                  {items.filter((it) => it.category === cat).length}
                </span>
                <svg
                  width="10"
                  height="6"
                  viewBox="0 0 10 6"
                  fill="none"
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
              </div>

              {!isCollapsed && (
                <div className="divide-y divide-gray-50 flex-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  {items
                    .filter((it) => it.category === cat)
                    .map((it, idx) => {
                      const id = `${cat}-${idx}`;
                      const checked = !!checkedItems[id];
                      const expanded = !!expandedItems[id];
                      const hasRecipes = it.recipes && it.recipes !== "Général";
                      const hasDetails = hasRecipes || !!it.quantityDetail;
                      const guessed = isGuessed(it.quantity);
                      const customId = it.customId;
                      return (
                        <div key={id} className="flex flex-col w-full">
                          <div className="flex items-start gap-3 px-4 py-4 hover:bg-gray-50/50 transition-colors group select-none">
                            <div
                              onClick={(e) => toggleCheck(id, e)}
                              className={`shrink-0 w-6 h-6 mt-0.5 rounded-full border-2 cursor-pointer flex items-center justify-center transition-all duration-300 ${
                                checked
                                  ? "bg-[#5C8C6A] border-[#5C8C6A] scale-105 shadow-sm"
                                  : "border-gray-200 group-hover:border-[#5C8C6A]"
                              }`}
                            >
                              {checked && (
                                <svg
                                  width="11"
                                  height="9"
                                  viewBox="0 0 10 8"
                                  fill="none"
                                >
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

                            <div className="flex-1 min-w-0 pr-1">
                              <span
                                className={`text-[14px] xs:text-[15px] font-semibold block leading-tight xs:leading-snug transition-all duration-300 ${
                                  checked
                                    ? "line-through text-gray-300 blur-[0.2px]"
                                    : "text-[#1A1A1A]"
                                }`}
                              >
                                {it.item}
                              </span>
                              {hasDetails && (
                                <div
                                  onClick={() => toggleExpand(id)}
                                  className="flex items-center gap-1 mt-1 cursor-pointer w-fit"
                                >
                                  <span
                                    className={`text-[10px] font-medium ${checked ? "text-gray-200" : "text-gray-400 group-hover:text-[#5C8C6A]"}`}
                                  >
                                    {expanded
                                      ? "Cacher les détails"
                                      : "Voir les détails"}
                                  </span>
                                  <svg
                                    width="8"
                                    height="6"
                                    viewBox="0 0 8 6"
                                    fill="none"
                                    className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""} ${checked ? "opacity-20" : "opacity-40"}`}
                                  >
                                    <path
                                      d="M1 1.5L4 4.5L7 1.5"
                                      stroke="currentColor"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </div>
                              )}
                            </div>

                            {it.quantity && (
                              <span
                                className={`shrink-0 text-[11px] xs:text-xs px-2.5 py-1 rounded-lg font-bold tracking-tight shadow-sm self-start mt-0.5 pointer-events-none ${
                                  guessed
                                    ? "bg-orange-50 text-orange-500 border border-orange-100/50"
                                    : "bg-[#EAF3EC] text-[#5C8C6A] border border-[#D1E6D6]"
                                }`}
                              >
                                {it.quantity}
                              </span>
                            )}
                            {it.isCustom && customId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveCustomItem(customId);
                                }}
                                title="Supprimer"
                                className="shrink-0 ml-1 w-5 h-5 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all self-start mt-1"
                              >
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                  <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                </svg>
                              </button>
                            )}
                          </div>

                          {expanded && hasDetails && (
                            <div className="px-12 pb-4 animate-in slide-in-from-top-2 duration-300">
                              <div
                                className={`text-[11px] font-medium leading-relaxed p-2 rounded-xl bg-gray-50/50 border border-gray-100/50 space-y-1 ${checked ? "text-gray-300" : "text-gray-500"}`}
                              >
                                {it.quantityDetail && (
                                  <p className="border-b border-gray-100 pb-1 mb-1">
                                    ⚖️ Détails : {it.quantityDetail}
                                  </p>
                                )}
                                {hasRecipes && <p>🥣 {it.recipes}</p>}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add item button and form */}
      <div className="mt-2">
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#5C8C6A] hover:text-[#5C8C6A] transition-all duration-200 font-semibold text-sm bg-white/50 hover:bg-[#F4FAF6]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Ajouter un article
          </button>
        ) : (
          <div className="bg-white rounded-2xl border border-[#D1E6D6] shadow-sm p-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="text-xs font-bold text-[#5C8C6A] uppercase tracking-wider mb-3">Ajouter un article</p>
            <div className="flex flex-col gap-2">
              <input
                ref={itemNameRef}
                type="text"
                placeholder="Nom de l'article *"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={handleAddItemKeyDown}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-[#1A1A1A] placeholder-gray-300 focus:outline-none focus:border-[#5C8C6A] transition-colors"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Quantité (optionnel)"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value)}
                  onKeyDown={handleAddItemKeyDown}
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-[#1A1A1A] placeholder-gray-300 focus:outline-none focus:border-[#5C8C6A] transition-colors"
                />
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#5C8C6A] transition-colors bg-white"
                >
                  {ALL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleAddItem}
                  disabled={!newItemName.trim()}
                  className="flex-1 py-2 rounded-xl bg-[#5C8C6A] text-white text-sm font-bold hover:bg-[#4a7458] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Ajouter
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setNewItemName(""); setNewItemQty(""); setNewItemCategory(DEFAULT_CUSTOM_CATEGORY); }}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-10 pt-6 border-t border-gray-200/60">
          <div
            onClick={() => toggleCategory(SUGGESTIONS_CATEGORY)}
            className="flex items-center justify-between mb-4 px-1 cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
                <span className="text-2xl">🐱</span> Conseils du Chat
              </h3>
              <span className="text-[10px] font-bold text-orange-400 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
                {suggestions.length} SUGGESTIONS
              </span>
            </div>
            <svg
              width="12"
              height="8"
              viewBox="0 0 10 6"
              fill="none"
              className={`transition-transform duration-300 ${collapsedCategories[SUGGESTIONS_CATEGORY] ? "-rotate-90" : ""} text-gray-400 group-hover:text-orange-400`}
            >
              <path
                d="M1 1L5 5L9 1"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {!collapsedCategories[SUGGESTIONS_CATEGORY] && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 animate-in fade-in slide-in-from-top-2 duration-300">
              {suggestions.map((it, idx) => {
                const id = `Suggestions du Chef-${idx}`;
                const checked = !!checkedItems[id];
                return (
                  <div
                    key={id}
                    onClick={(e) => toggleCheck(id, e)}
                    className={`relative p-5 rounded-3xl border-2 transition-all duration-400 cursor-pointer overflow-hidden group ${
                      checked
                        ? "bg-gray-50 border-gray-100 opacity-60"
                        : "bg-[#FFFDF8] border-[#F2EADA] hover:border-[#D4A373] hover:shadow-md active:scale-[0.98]"
                    }`}
                  >
                    <div className="relative flex gap-4 z-10">
                      <div
                        className={`shrink-0 w-6 h-6 mt-1 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                          checked
                            ? "bg-[#D4A373] border-[#D4A373] scale-105"
                            : "border-[#E8DAB7] group-hover:border-[#D4A373]"
                        }`}
                      >
                        {checked && (
                          <svg
                            width="11"
                            height="9"
                            viewBox="0 0 10 8"
                            fill="none"
                          >
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
                            className={`text-[15px] font-bold leading-tight ${checked ? "line-through text-gray-400" : "text-[#1A1A1A]"}`}
                          >
                            {it.item}
                          </span>
                        </div>
                        <p
                          className={`text-xs leading-relaxed mb-3 ${checked ? "text-gray-300" : "text-gray-600 font-medium"}`}
                        >
                          {it.quantity}
                        </p>
                        {it.recipes && (
                          <div className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-[#D4A373]"></span>
                            <p
                              className={`text-[10px] font-bold uppercase tracking-wider ${checked ? "text-gray-200" : "text-[#D4A373]"}`}
                            >
                              {it.recipes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    {!checked && (
                      <div className="absolute top-0 right-0 p-3">
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
