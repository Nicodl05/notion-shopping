"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("Mot de passe incorrect");
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F7F4] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-xl border border-gray-100 flex flex-col items-center">
        <div className="w-16 h-16 bg-[#4a7458] rounded-2xl flex items-center justify-center mb-6 shadow-md">
          <span className="text-3xl" aria-hidden="true">🛒</span>
        </div>

        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">
          Accès restreint
        </h1>
        <p className="text-gray-600 text-sm mb-8 text-center leading-relaxed">
          Entrez le mot de passe pour accéder <br /> à votre liste Notion
          Shopping
        </p>

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div className="space-y-1">
            <label htmlFor="password" className="sr-only">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
              className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#5C8C6A] focus:outline-none transition-all text-[#1A1A1A] text-center"
              required
            />
            {error && (
              <p
                id="login-error"
                role="alert"
                className="text-red-700 text-[11px] font-bold text-center mt-2 uppercase tracking-wider"
              >
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-2xl font-bold transition-all shadow-lg active:scale-[0.98] ${
              loading
                ? "bg-gray-600 text-white cursor-not-allowed"
                : "bg-[#4a7458] text-white hover:bg-[#3d6049] hover:shadow-xl"
            }`}
          >
            {loading ? "Chargement..." : "Accéder"}
          </button>
        </form>
      </div>
    </main>
  );
}
