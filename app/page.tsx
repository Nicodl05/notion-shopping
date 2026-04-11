"use client";

import { useEffect, useState, useCallback } from "react";
import { ShoppingItem, NotionBlock, UIState } from "@/app/types";
import NotionContent from "@/app/components/NotionContent";
import ShoppingList from "@/app/components/ShoppingList";
import GenerateButton from "@/app/components/GenerateButton";

export default function Home() {
  const [state, setState] = useState<UIState>("idle");
  const [notionBlocks, setNotionBlocks] = useState<NotionBlock[]>([]);
  const [notionContent, setNotionContent] = useState("");
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [notionLoading, setNotionLoading] = useState(true);
  const [notionError, setNotionError] = useState("");

  const loadNotionContent = useCallback(async () => {
    setNotionLoading(true);
    setNotionError("");
    try {
      const res = await fetch("/api/notion");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors du chargement Notion");
      setNotionBlocks(data.blocks);
      setNotionContent(data.content);
    } catch (err) {
      setNotionError(
        err instanceof Error ? err.message : "Impossible de charger le contenu Notion"
      );
    } finally {
      setNotionLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotionContent();
  }, [loadNotionContent]);

  const handleGenerate = async () => {
    setState("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: notionContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la génération");
      if (data.noFood) {
        setShoppingItems([]);
      } else {
        setShoppingItems(data.items);
      }
      setState("success");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Une erreur est survenue"
      );
      setState("error");
    }
  };

  const handleToggle = (index: number) => {
    setShoppingItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleSave = async () => {
    setState("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: shoppingItems }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la sauvegarde");
      setState("saved");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Impossible d'enregistrer dans Notion"
      );
      setState("error");
    }
  };

  const handleRetry = () => {
    setState("idle");
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🛒 Notion Shopping</h1>
          <p className="mt-1 text-gray-500 text-sm">
            Générez votre liste de courses depuis votre page Notion
          </p>
        </header>

        {/* Notion Content Section */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Contenu Notion
          </h2>
          <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 min-h-[120px]">
            {notionLoading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span>Chargement du contenu Notion...</span>
              </div>
            ) : notionError ? (
              <div className="text-red-500 text-sm">
                <p className="font-medium">Erreur de connexion Notion</p>
                <p className="text-red-400 text-xs mt-1">{notionError}</p>
                <button
                  onClick={loadNotionContent}
                  className="mt-2 text-xs underline text-red-500 hover:text-red-700"
                >
                  Réessayer
                </button>
              </div>
            ) : (
              <NotionContent blocks={notionBlocks} />
            )}
          </div>
        </section>

        {/* Action Section */}
        <section className="mb-8">
          {state === "idle" && (
            <GenerateButton
              onClick={handleGenerate}
              isLoading={false}
              disabled={notionLoading || !!notionError || notionContent === ""}
            />
          )}

          {state === "loading" && (
            <GenerateButton onClick={handleGenerate} isLoading={true} />
          )}

          {state === "error" && (
            <div className="space-y-3">
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                {errorMessage}
              </div>
              <button
                onClick={handleRetry}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ← Réessayer
              </button>
            </div>
          )}

          {state === "success" && (
            <div className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Liste de courses générée
              </h2>
              <div className="border border-gray-100 rounded-xl p-4">
                <ShoppingList items={shoppingItems} onToggle={handleToggle} />
              </div>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={handleSave}
                  className="px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  📥 Enregistrer dans Notion
                </button>
                <button
                  onClick={handleRetry}
                  className="px-4 py-3 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ↺ Regénérer
                </button>
              </div>
            </div>
          )}

          {state === "saved" && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 flex items-center gap-2">
                <span>✅</span>
                <span>Liste enregistrée dans Notion !</span>
              </div>
              <div className="border border-gray-100 rounded-xl p-4">
                <ShoppingList items={shoppingItems} onToggle={handleToggle} />
              </div>
              <button
                onClick={handleRetry}
                className="px-4 py-3 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ↺ Nouvelle liste
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
