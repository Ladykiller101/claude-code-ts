"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'envoi");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Erreur serveur, veuillez reessayer");
    } finally {
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
        <h1 className="text-2xl font-bold text-white">Mot de passe oublie</h1>
        <p className="text-gray-400 mt-2">
          Entrez votre email pour recevoir un lien de reinitialisation
        </p>
      </div>

      {success ? (
        <div className="space-y-4">
          <div className="bg-green-900/30 border border-green-700/50 text-green-300 rounded-lg px-4 py-3 text-sm">
            Un email de reinitialisation a ete envoye a <strong>{email}</strong>.
            Verifiez votre boite de reception (et vos spams).
          </div>
          <p className="text-center">
            <Link
              href="/login"
              className="text-indigo-400 hover:text-indigo-300 text-sm"
            >
              Retour a la connexion
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#14141f] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="votre@email.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? "Envoi..." : "Envoyer le lien"}
          </button>

          <p className="text-center">
            <Link
              href="/login"
              className="text-gray-400 hover:text-gray-300 text-sm"
            >
              Retour a la connexion
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
