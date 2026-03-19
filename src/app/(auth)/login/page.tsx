"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // The login API sets auth cookies directly on the response via Set-Cookie headers.
      // No client-side setSession() needed — the middleware will read those cookies.
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur de connexion");
        setLoading(false);
        return;
      }

      // Cookies are already set by the server response.
      // router.refresh() forces Next.js to re-run middleware with the new cookies,
      // then router.push() navigates to the authenticated page.
      router.refresh();
      router.push(data.redirect || "/dashboard");
    } catch {
      setError("Erreur serveur, veuillez reessayer");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69526909c9abd3fd3f363e37/2bf5526b2_Sygma-Conseils-logo-320-1.png"
          alt="SYGMA Conseils"
          className="h-12 w-auto mx-auto mb-6"
        />
        <h1 className="text-2xl font-bold text-white">Connexion</h1>
        <p className="text-gray-400 mt-2">Accedez a votre espace FinFlow</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-[#14141f] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="votre@email.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-[#14141f] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <div className="space-y-3 text-center text-sm">
        <p>
          <Link
            href="/forgot-password"
            className="text-indigo-400 hover:text-indigo-300"
          >
            Mot de passe oublie ?
          </Link>
        </p>
        <p className="text-gray-400">
          Pas encore de compte ?{" "}
          <Link href="/signup" className="text-indigo-400 hover:text-indigo-300">
            Creer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
