"use client";
import React, { useEffect, useRef, useState } from "react";
import { ALL_CATEGORIES, DEFAULT_CUSTOM_CATEGORY } from "@/lib/categories";

export type NewItemData = {
  name: string;
  quantity: string;
  category: string;
};

/**
 * Formulaire d'ajout d'article. Son état est local : la frappe ne re-rend
 * pas la liste des courses.
 */
export default function AddItemForm({
  onAdd,
  onCancel,
}: {
  onAdd: (data: NewItemData) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState(DEFAULT_CUSTOM_CATEGORY);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const trimmedName = name.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmedName) return;
    onAdd({ name: trimmedName, quantity: quantity.trim(), category });
  };

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
      className="bg-white rounded-2xl border border-[#D1E6D6] shadow-sm p-4"
    >
      <p className="text-xs font-bold text-[#4a7458] uppercase tracking-wider mb-3">
        Ajouter un article
      </p>
      <div className="flex flex-col gap-2">
        <input
          ref={nameRef}
          type="text"
          aria-label="Nom de l'article"
          placeholder="Nom de l'article *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-[#1A1A1A] placeholder-gray-500 focus:outline-none focus:border-[#5C8C6A] transition-colors"
        />
        <div className="flex gap-2">
          <input
            type="text"
            aria-label="Quantité"
            placeholder="Quantité (optionnel)"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-[#1A1A1A] placeholder-gray-500 focus:outline-none focus:border-[#5C8C6A] transition-colors"
          />
          <select
            aria-label="Catégorie"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#5C8C6A] transition-colors bg-white"
          >
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={!trimmedName}
            className="flex-1 py-2 rounded-xl bg-[#4a7458] text-white text-sm font-bold hover:bg-[#3d6049] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Ajouter
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-all"
          >
            Annuler
          </button>
        </div>
      </div>
    </form>
  );
}
