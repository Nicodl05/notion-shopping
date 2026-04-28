"use client";
import React, { useState, useEffect } from "react";
import NotionContent from "@/components/NotionContent";
import ShoppingList from "@/components/ShoppingList";
import { Loader2, RefreshCw } from "lucide-react";
import type { ShoppingItem, Recipe } from "@/types/shopping";

type UIState = "idle" | "loading" | "success" | "error" | "empty";

const SESSION_STORAGE_KEY = "notion-shopping:home-state";
const SHOPPING_LIST_SESSION_STORAGE_KEY = "notion-shopping:shopping-list";

type PersistedState = {
  notionContent: string;
  recipes: Recipe[];
  shoppingItems: ShoppingItem[];
  uiState: UIState;
  errorMessage: string;
};

export default function Home() {
  const [notionContent, setNotionContent] = useState<string>("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [uiState, setUiState] = useState<UIState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const rawState = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (rawState) {
        const parsedState = JSON.parse(rawState) as Partial<PersistedState>;
        if (typeof parsedState.notionContent === "string") {
          setNotionContent(parsedState.notionContent);
        }
        if (Array.isArray(parsedState.recipes)) {
          setRecipes(parsedState.recipes);
        }
        if (Array.isArray(parsedState.shoppingItems)) {
          setShoppingItems(parsedState.shoppingItems);
        }
        if (parsedState.uiState) {
          setUiState(parsedState.uiState);
        }
        if (typeof parsedState.errorMessage === "string") {
          setErrorMessage(parsedState.errorMessage);
        }
      }
    } catch {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const persistedState: PersistedState = {
      notionContent,
      recipes,
      shoppingItems,
      uiState,
      errorMessage,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(persistedState));
  }, [notionContent, recipes, shoppingItems, uiState, errorMessage, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (notionContent || uiState === "success" || uiState === "empty") {
      return;
    }

    fetch("/api/notion")
      .then((res) => {
        if (!res.ok)
          throw new Error("Impossible de récupérer le planning Notion.");
        return res.json();
      })
      .then((data) => {
        if (data.empty) {
          setUiState("empty");
        } else {
          setNotionContent(data.content);
          setRecipes(data.recipes || []);
        }
      })
      .catch((err) => {
        setErrorMessage(err.message);
        setUiState("error");
      });
  }, [isHydrated, notionContent, uiState]);

  const handleGenerate = async () => {
    if (!notionContent) {
      setErrorMessage("Aucun contenu Notion trouvé à analyser.");
      setUiState("error");
      return;
    }
    setUiState("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: notionContent }),
      });
      if (!res.ok) throw new Error("Erreur lors de la génération par Mistral.");
      const data = await res.json();
      if (!data.items?.length) {
        setErrorMessage("Aucun ingrédient détecté dans le planning.");
        setUiState("error");
      } else {
        setShoppingItems(data.items);
        setUiState("success");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Erreur inconnue");
      setUiState("error");
    }
  };

  const handleReset = () => {
    setUiState("idle");
    setErrorMessage("");
    setShoppingItems([]);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(SHOPPING_LIST_SESSION_STORAGE_KEY);
  };

  const isLoading = uiState === "loading";
  const hasResult = uiState === "success";
  const isEmpty = uiState === "empty";

  return (
    <main className="min-h-screen bg-[#F8F7F4] pb-24 md:pb-32">
      <div className="max-w-[800px] mx-auto px-4 md:px-8 pt-8 md:pt-16">
        <header className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-4 mb-8 md:mb-12">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl md:text-3xl">🛒</span>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-[#1A1A1A] tracking-tight">
                Notion Shopping
              </h1>
            </div>
            <div className="flex items-center gap-2 ml-[36px] md:ml-[52px]">
              <p className="text-[11px] md:text-sm text-gray-400 font-medium">
                Propulsé par
              </p>
              <div className="flex items-center gap-1 bg-[#F5F5F5] px-2 py-0.5 rounded-md border border-gray-100 scale-90 md:scale-100 origin-left">
                <svg viewBox="0 0 100 100" className="w-3 h-3 fill-[#FD6F00]">
                  <path d="M10 20h20v60H10zM40 20h20v60H40zM70 20h20v60H70zM10 20h80v20H10z" />
                </svg>
                <span className="text-[9px] md:text-[10px] font-bold text-[#1A1A1A] tracking-wider uppercase">
                  Mistral AI
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end xs:self-auto">
            {hasResult && (
              <button
                onClick={handleReset}
                title="Réinitialiser"
                className="p-2 rounded-full text-gray-400 hover:text-[#1A1A1A] hover:bg-gray-200 transition-all bg-white/50 border border-gray-100 shadow-sm xs:shadow-none xs:bg-transparent xs:border-none"
              >
                <RefreshCw size={18} />
              </button>
            )}
          </div>
        </header>

        {(uiState === "idle" || uiState === "error") && (
          <div className="flex justify-center mb-10">
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 bg-[#1A1A1A] text-white px-8 py-4 rounded-2xl font-bold text-base shadow-lg hover:bg-[#2d2d2d] active:scale-95 transition-all duration-200"
            >
              Générer ma liste de courses
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="animate-spin text-[#5C8C6A]" size={44} />
            <p className="text-gray-500 font-medium animate-pulse">
              Analyse en cours…
            </p>
          </div>
        )}

        {uiState === "error" && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 mb-8">
            <p className="font-semibold text-red-700 mb-1">
              Une erreur est survenue
            </p>
            <p className="text-red-500 text-sm">{errorMessage}</p>
          </div>
        )}

        {isEmpty && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 mb-8 flex flex-col items-center text-center gap-3">
            <span className="text-4xl">📅</span>
            <p className="font-semibold text-amber-800 text-base">
              Aucun repas planifié pour les 10 prochains jours
            </p>
            <p className="text-amber-600 text-sm max-w-sm">
              Votre planning Notion est vide pour cette période. Ajoutez des
              repas dans Notion pour pouvoir générer votre liste de courses.
            </p>
            {process.env.NEXT_PUBLIC_NOTION_PAGE_URL && (
              <a
                href={process.env.NEXT_PUBLIC_NOTION_PAGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-2 bg-amber-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-amber-800 active:scale-95 transition-all"
              >
                Ouvrir Notion
              </a>
            )}
          </div>
        )}

        {!isLoading && (
          <div className="space-y-8">
            <NotionContent content={notionContent} recipes={recipes} />
            <ShoppingList items={shoppingItems} />
          </div>
        )}
      </div>
    </main>
  );
}
