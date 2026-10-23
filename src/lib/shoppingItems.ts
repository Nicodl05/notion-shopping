import { SUGGESTIONS_CATEGORY } from "@/lib/categories";
import type { ShoppingItem } from "@/types/shopping";

export const isGuessed = (quantity: string) =>
  !quantity || !/\d/.test(quantity);

const normalizeName = (name: string) => name.toLowerCase().trim();

const mergeQuantities = (current: string, next: string): string => {
  const num1 = parseFloat(current);
  const num2 = parseFloat(next);
  if (!isNaN(num1) && !isNaN(num2)) {
    const unit1 = current.replace(/[\d.,]/g, "").trim();
    const unit2 = next.replace(/[\d.,]/g, "").trim();
    if (unit1 === unit2) return `${num1 + num2}${unit1}`;
  }
  return `${current} + ${next}`;
};

/**
 * Regroupe les articles générés par catégorie et nom (insensible à la casse).
 * Les suggestions du chef ne sont pas regroupées. Fonction pure : les objets
 * d'entrée ne sont jamais modifiés.
 */
export const groupItems = (rawItems: ShoppingItem[]): ShoppingItem[] => {
  const result: ShoppingItem[] = [];
  const byKey = new Map<string, ShoppingItem>();

  for (const current of rawItems) {
    if (current.category === SUGGESTIONS_CATEGORY) {
      result.push(current);
      continue;
    }

    const key = `${current.category}\n${normalizeName(current.item)}`;
    const existing = byKey.get(key);

    if (!existing) {
      const copy = { ...current };
      byKey.set(key, copy);
      result.push(copy);
      continue;
    }

    const currentQty = current.quantity.trim();
    if (!existing.quantity.toLowerCase().includes(currentQty.toLowerCase())) {
      existing.quantity = mergeQuantities(existing.quantity, currentQty);
    }
    if (current.recipes && !existing.recipes?.includes(current.recipes)) {
      existing.recipes = existing.recipes
        ? `${existing.recipes}, ${current.recipes}`
        : current.recipes;
    }
  }

  return result;
};

/**
 * Identifiant stable d'un article principal dans une génération : unique
 * car les articles générés sont regroupés, et les ajouts ont un customId.
 */
export const getItemId = (item: ShoppingItem): string =>
  item.customId ?? `${item.category}\n${normalizeName(item.item)}`;

/** Identifiant d'une suggestion : son rang dans la génération courante. */
export const getSuggestionId = (index: number): string =>
  `${SUGGESTIONS_CATEGORY}\n${index}`;
