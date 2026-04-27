export interface ShoppingItem {
  category: string;
  item: string;
  quantity: string;
  recipes?: string;
  quantityDetail?: string;
  isCustom?: boolean;
  customId?: string;
}

export interface RecipeIngredient {
  name: string;
  value: string;
}

export interface Recipe {
  id: string;
  name: string;
  dateLabel: string;
  dateValue: string;
  ingredients: RecipeIngredient[];
  textSummary: string;
  url: string;
  hasTitle: boolean;
}
