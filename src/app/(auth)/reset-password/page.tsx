"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // When Supabase redirects here after the password reset email,
    // it includes a token in the URL hash that the client library picks up
    const supabase = createClient();

    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setHasSession(true);
      }
      setChecking(false);
    });

    // Also check if already in a session (user might have clicked the link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true);
      }
      setChecking(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 2000);
    } catch {
      setError("Erreur serveur, veuillez reessayer");
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="text-center">
        <p className="text-gray-400">Verification en cours...</p>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69526909c9abd3fd3f363e37/2bf5526b2_Sygma-Conseils-logo-320-1.png"
            alt="SYGMA Conseils"
            className="h-12 w-auto mx-auto mb-6"
          />
          <h1 className="text-2xl font-bold text-white">Lien expire</h1>
          <p className="text-gray-400 mt-2">
            Ce lien de reinitialisation est expire ou invalide.
          </p>
        </div>
        <div className="text-center">
          <Link
            href="/forgot-password"
            className="text-indigo-400 hover:text-indigo-300 text-sm"
          >
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69526909c9abd3fd3f363e37/2bf5526b2_Sygma-Conseils-logo-320-1.png"
          alt="SYGMA Conseils"
          className="h-12 w-auto mx-auto mb-6"
        />
        <h1 className="text-2xl font-bold text-white">
          Nouveau mot de passe
        </h1>
        <p className="text-gray-400 mt-2">
          Choisissez un nouveau mot de passe pour votre compte
        </p>
      </div>

      {success ? (
        <div className="bg-green-900/30 border border-green-700/50 text-green-300 rounded-lg px-4 py-3 text-sm text-center">
          Mot de passe mis a jour avec succes. Redirection...
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
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#14141f] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Min. 6 caracteres"
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#14141f] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? "Mise a jour..." : "Mettre a jour le mot de passe"}
          </button>
        </form>
      )}
    </div>
  );
}
