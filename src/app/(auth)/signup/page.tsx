"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("firm_admin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Use server-side API route which auto-confirms the email
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de la creation du compte");
        setLoading(false);
        return;
      }

      // Account created and auto-confirmed — sign in immediately
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
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
        <h1 className="text-2xl font-bold text-white">Creer un compte</h1>
        <p className="text-gray-400 mt-2">Rejoignez SYGMA Conseils sur FinFlow</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Nom complet</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-3 bg-[#14141f] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Votre nom"
            required
          />
        </div>

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
            placeholder="Min. 6 caracteres"
            minLength={6}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-4 py-3 bg-[#14141f] border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="firm_admin">Administrateur cabinet</option>
            <option value="accountant">Comptable</option>
            <option value="payroll_manager">Gestionnaire paie</option>
            <option value="client_admin">Client — Administrateur</option>
            <option value="client_hr">Client — RH</option>
            <option value="client_readonly">Client — Lecture seule</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? "Creation..." : "Creer mon compte"}
        </button>
      </form>

      <p className="text-center text-gray-400 text-sm">
        Deja un compte ?{" "}
        <Link href="/login" className="text-indigo-400 hover:text-indigo-300">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
