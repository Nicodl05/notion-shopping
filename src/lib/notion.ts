type NotionRichTextItem = {
  plain_text?: string;
};

type NotionProperty = {
  type?: string;
  [key: string]: unknown;
};

const toPlainText = (items: NotionRichTextItem[] | undefined) =>
  items?.map((item) => item.plain_text || "").join("") || "";

const extractFormulaText = (formula: any) => {
  if (!formula || typeof formula !== "object") return "";

  switch (formula.type) {
    case "string":
      return formula.string || "";
    case "number":
      return formula.number === null || formula.number === undefined
        ? ""
        : String(formula.number);
    case "boolean":
      return formula.boolean ? "Oui" : "Non";
    case "date":
      return formula.date?.start || "";
    default:
      return "";
  }
};

const extractRollupText = (rollup: any) => {
  const items = rollup?.array;
  if (!Array.isArray(items)) return "";

  return items
    .map((item: any) => {
      if (!item || typeof item !== "object") return "";

      if (item.type === "title") return toPlainText(item.title);
      if (item.type === "rich_text") return toPlainText(item.rich_text);
      if (item.type === "formula") return extractFormulaText(item.formula);
      if (item.type === "select") return item.select?.name || "";
      if (item.type === "status") return item.status?.name || "";
      if (item.type === "multi_select") {
        return item.multi_select?.map((option: any) => option.name).join(", ") || "";
      }

      return item.plain_text || "";
    })
    .filter(Boolean)
    .join(", ");
};

export const isIngredientProperty = (name: string) =>
  name.toLowerCase().includes("ingrédient") ||
  name.toLowerCase().includes("ingredient") ||
  name.includes("\u03a3");

export const extractPropertyText = (prop: NotionProperty | undefined): string => {
  if (!prop || typeof prop !== "object") return "";

  switch (prop.type) {
    case "title":
      return toPlainText((prop as any).title);
    case "rich_text":
      return toPlainText((prop as any).rich_text);
    case "select":
      return (prop as any).select?.name || "";
    case "multi_select":
      return (prop as any).multi_select?.map((option: any) => option.name).join(", ") || "";
    case "status":
      return (prop as any).status?.name || "";
    case "number":
      return (prop as any).number === null || (prop as any).number === undefined
        ? ""
        : String((prop as any).number);
    case "checkbox":
      return (prop as any).checkbox ? "Oui" : "Non";
    case "date":
      return (prop as any).date?.start || "";
    case "people":
      return (prop as any).people?.map((person: any) => person.name || person.id).join(", ") || "";
    case "url":
    case "email":
    case "phone_number":
      return ((prop as any)[prop.type] as string) || "";
    case "formula":
      return extractFormulaText((prop as any).formula);
    case "rollup":
      return extractRollupText((prop as any).rollup);
    case "relation":
      return (prop as any).relation?.map((item: any) => item.id).join(", ") || "";
    default:
      return "";
  }
};

export const findPrimaryPageName = (props: Record<string, NotionProperty> | undefined) => {
  const fallbackKeys = [
    "nom dans titre",
    "Nom",
    "Name",
    "Titre",
    "Title",
    "Recette",
    "Plat",
    "Dish",
  ];

  for (const key of fallbackKeys) {
    const prop = props?.[key];
    const value = extractPropertyText(prop);
    if (value) {
      return {
        name: value,
        sourceProperty: key,
        hasTitle: prop?.type === "title",
      };
    }
  }

  const entries = Object.entries(props || {});
  const titleEntry = entries.find(([, prop]) => prop?.type === "title" && extractPropertyText(prop));
  if (titleEntry) {
    return {
      name: extractPropertyText(titleEntry[1]),
      sourceProperty: titleEntry[0],
      hasTitle: true,
    };
  }

  const preferredTextEntry = entries.find(([name, prop]) => {
    if (!prop?.type) return false;
    if (!/nom|titre|title|recette|plat|dish/i.test(name)) return false;
    return [
      "rich_text",
      "formula",
      "select",
      "multi_select",
      "status",
      "number",
      "checkbox",
      "date",
      "people",
      "url",
      "email",
      "phone_number",
      "rollup",
    ].includes(prop.type) && Boolean(extractPropertyText(prop));
  });

  if (preferredTextEntry) {
    return {
      name: extractPropertyText(preferredTextEntry[1]),
      sourceProperty: preferredTextEntry[0],
      hasTitle: false,
    };
  }

  const textEntry = entries.find(([, prop]) => {
    if (!prop?.type) return false;
    return [
      "rich_text",
      "formula",
      "select",
      "multi_select",
      "status",
      "number",
      "checkbox",
      "date",
      "people",
      "url",
      "email",
      "phone_number",
      "rollup",
    ].includes(prop.type) && Boolean(extractPropertyText(prop));
  });

  return {
    name: textEntry ? extractPropertyText(textEntry[1]) : "Sans nom",
    sourceProperty: textEntry?.[0] || "",
    hasTitle: false,
  };
};