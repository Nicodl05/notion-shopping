export const SUGGESTIONS_CATEGORY = "Suggestions du Chef";
export const DEFAULT_CUSTOM_CATEGORY = "Ajouts personnalisés";

export const ALL_CATEGORIES: string[] = [
  "Fruits & Légumes",
  "Viandes & Charcuterie",
  "Poissons & Fruits de mer",
  "Produits laitiers & Œufs",
  "Épicerie sèche",
  "Conserves",
  "Boulangerie & Pâtisserie",
  "Surgelés",
  "Boissons & Condiments",
  "Utilitaires",
  DEFAULT_CUSTOM_CATEGORY,
];

export const CATEGORY_ICONS: Record<string, string> = {
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

export const getCategoryIcon = (cat: string): string =>
  CATEGORY_ICONS[cat] ?? "🛒";
