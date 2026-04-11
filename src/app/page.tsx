"use client";
import React, { useState, useEffect } from "react";
import NotionContent from "@/components/NotionContent";
import ShoppingList from "@/components/ShoppingList";
import { Loader2, RefreshCw } from "lucide-react";

type UIState = "idle" | "loading" | "success" | "error";

interface ShoppingItem {
  category: string;
  item: string;
  quantity: string;
}

export default function Home() {
  const [notionContent, setNotionContent] = useState<string>("");
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [uiState, setUiState] = useState<UIState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetch("/api/notion")
      .then((res) => {
        if (!res.ok)
          throw new Error("Impossible de récupérer le planning Notion.");
        return res.json();
      })
      .then((data) => setNotionContent(data.content))
      .catch((err) => {
        setErrorMessage(err.message);
        setUiState("error");
      });
  }, []);

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
    } catch (err: any) {
      setErrorMessage(err.message);
      setUiState("error");
    }
  };

  const handleReset = () => {
    setUiState("idle");
    setErrorMessage("");
    setShoppingItems([]);
  };

  const isLoading = uiState === "loading";
  const hasResult = uiState === "success";

  return (
    <main className="min-h-screen bg-[#F8F7F4] pb-32">
      <div className="max-w-[800px] mx-auto px-4 md:px-8 pt-10 md:pt-16">
        <header className="flex items-start justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl">🛒</span>
              <h1 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] tracking-tight">
                Notion Shopping
              </h1>
            </div>
            <p className="text-sm text-gray-400 ml-[52px] font-medium">
              Liste de courses intelligente · Mistral AI
            </p>
          </div>
          {hasResult && (
            <button
              onClick={handleReset}
              title="Réinitialiser"
              className="mt-1 p-2 rounded-full text-gray-400 hover:text-[#1A1A1A] hover:bg-gray-200 transition-all"
            >
              <RefreshCw size={18} />
            </button>
          )}
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

        {!isLoading && (
          <div className="space-y-8">
            <NotionContent content={notionContent} />
            <ShoppingList items={shoppingItems} />
          </div>
        )}
      </div>
    </main>
  );
}
