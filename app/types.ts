export interface ShoppingItem {
  category: string;
  item: string;
  quantity: string;
  checked?: boolean;
}

export interface NotionBlock {
  id: string;
  type: string;
  text: string;
}

export type UIState = "idle" | "loading" | "success" | "saved" | "error";
