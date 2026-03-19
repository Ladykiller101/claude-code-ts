"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";
import type { User } from "@supabase/supabase-js";

interface AuthUser extends Profile {
  supabase_user?: User;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (supabaseUser: User) => {
    const supabase = createClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", supabaseUser.id)
      .single();

    if (error) {
      console.warn("Profile fetch error (using fallback):", error.message);
    }

    if (profile) {
      setUser({ ...profile, supabase_user: supabaseUser } as AuthUser);
    } else {
      // Profile missing — create it via server endpoint (bypasses RLS)
      try {
        const res = await fetch("/api/auth/ensure-profile", { method: "POST" });
        if (res.ok) {
          const { profile: created } = await res.json();
          if (created) {
            setUser({ ...created, supabase_user: supabaseUser } as AuthUser);
            return;
          }
        }
      } catch (e) {
        console.warn("Failed to ensure profile:", e);
      }

      // Final fallback — use auth metadata (RLS will still block queries)
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email || "",
        full_name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split("@")[0] || "",
        role: (supabaseUser.user_metadata?.role as Profile["role"]) || "firm_admin",
        company_id: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        supabase_user: supabaseUser,
      });
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Safety timeout — never stay loading more than 5s
    const timeout = setTimeout(() => {
      setIsLoading((prev) => {
        if (prev) console.warn("Auth loading timeout — forcing render");
        return false;
      });
    }, 5000);

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user).catch(console.error);
      }
      setIsLoading(false);
    }).catch((err) => {
      console.error("Auth session error:", err);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          if (session?.user) {
            await fetchProfile(session.user);
          } else {
            setUser(null);
          }
        } catch (err) {
          console.error("Auth state change error:", err);
        }
        setIsLoading(false);
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = async () => {
    try {
      // 1. Clear server-side cookies via API route
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.warn("Server logout failed:", e);
    }
    try {
      // 2. Clear client-side Supabase session
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Client signOut failed:", e);
    }
    // 3. Clear user state
    setUser(null);
    // 4. Force hard navigation to fully clear everything
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
