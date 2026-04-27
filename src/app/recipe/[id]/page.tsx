"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, ExternalLink } from "lucide-react";

interface Ingredient {
  name: string;
  value: string;
}

interface Property {
  name: string;
  type: string;
  value: string;
}

interface RecipeDetails {
  id: string;
  name: string;
  url: string;
  dateLabel: string;
  dateValue: string;
  ingredients: Ingredient[];
  otherProperties: Property[];
  hasTitle: boolean;
}

export default function RecipeDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<RecipeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const res = await fetch(`/api/recipe/${params.id}`);
        if (!res.ok) throw new Error("Impossible de récupérer la recette");
        const data = await res.json();
        setRecipe(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchRecipe();
    }
  }, [params.id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F7F4] pb-24">
        <div className="max-w-[800px] mx-auto px-4 md:px-8 pt-8 md:pt-16">
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="animate-spin text-[#5C8C6A]" size={44} />
            <p className="text-gray-500 font-medium animate-pulse">
              Chargement de la recette…
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !recipe) {
    return (
      <main className="min-h-screen bg-[#F8F7F4] pb-24">
        <div className="max-w-[800px] mx-auto px-4 md:px-8 pt-8 md:pt-16">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-gray-600 hover:text-[#1A1A1A] mb-8 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Retour au planning</span>
          </button>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
            <p className="font-semibold text-red-700 mb-1">
              Erreur lors du chargement
            </p>
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F7F4] pb-24">
      <div className="max-w-[800px] mx-auto px-4 md:px-8 pt-8 md:pt-16">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-gray-600 hover:text-[#1A1A1A] mb-8 transition-colors group"
        >
          <ArrowLeft
            size={20}
            className="group-hover:-translate-x-1 transition-transform"
          />
          <span className="font-medium">Retour au planning</span>
        </button>

        <div className="space-y-6">
          {/* Recipe Header */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-extrabold text-[#1A1A1A] mb-3">
                  {recipe.name}
                </h1>
                {recipe.dateLabel && (
                  <div className="inline-flex items-center gap-2 bg-[#EAF3EC] text-[#5C8C6A] px-4 py-2 rounded-xl">
                    <span className="text-lg">📅</span>
                    <span className="text-sm font-semibold capitalize">
                      {recipe.dateLabel}
                    </span>
                  </div>
                )}
              </div>
              {recipe.url && (
                <a
                  href={recipe.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-[#1A1A1A] text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-[#2d2d2d] active:scale-95 transition-all shadow-sm self-start sm:self-auto"
                >
                  <span>Voir la recette</span>
                  <ExternalLink size={16} />
                </a>
              )}
            </div>

            {!recipe.hasTitle && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mt-4">
                <p className="text-amber-800 text-sm font-medium">
                  ⚠️ Le titre de cette recette n'est pas renseigné dans Notion.
                  Veuillez le compléter pour accéder au lien de la recette.
                </p>
              </div>
            )}
          </div>

          {/* Ingredients Section */}
          {recipe.ingredients.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
              <div className="flex items-center gap-2 mb-5">
                <span className="text-2xl">🥘</span>
                <h2 className="text-xl md:text-2xl font-bold text-[#1A1A1A]">
                  Ingrédients requis
                </h2>
              </div>
              <div className="space-y-4">
                {recipe.ingredients.map((ingredient, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-start gap-2 pb-4 border-b border-gray-50 last:border-b-0 last:pb-0"
                  >
                    <span className="shrink-0 text-xs font-bold text-[#5C8C6A] bg-[#EAF3EC] px-3 py-1.5 rounded-lg uppercase tracking-wider sm:min-w-[140px]">
                      {ingredient.name}
                    </span>
                    <p className="text-[15px] text-gray-700 font-medium leading-relaxed flex-1">
                      {ingredient.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Properties Section */}
          {recipe.otherProperties.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
              <div className="flex items-center gap-2 mb-5">
                <span className="text-2xl">📝</span>
                <h2 className="text-xl md:text-2xl font-bold text-[#1A1A1A]">
                  Informations supplémentaires
                </h2>
              </div>
              <div className="space-y-3">
                {recipe.otherProperties.map((prop, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-start gap-2 pb-3 border-b border-gray-50 last:border-b-0 last:pb-0"
                  >
                    <span className="shrink-0 text-xs font-semibold text-gray-500 uppercase tracking-wider sm:min-w-[140px]">
                      {prop.name}
                    </span>
                    <p className="text-sm text-gray-700 leading-relaxed flex-1">
                      {prop.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {recipe.ingredients.length === 0 &&
            recipe.otherProperties.length === 0 && (
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 text-center">
                <span className="text-5xl mb-3 block">🤷</span>
                <p className="text-gray-600 font-medium">
                  Aucune information supplémentaire disponible pour cette
                  recette.
                </p>
              </div>
            )}
        </div>
      </div>
    </main>
  );
}
