import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    // Step 1: Try to sign in via Supabase REST API (no server cookies needed)
    const signInResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ email, password }),
      }
    );

    const signInResult = await signInResponse.json();

    // Step 2: If sign-in succeeded, return success with role-based redirect
    if (signInResponse.ok && signInResult.user) {
      const admin = createAdminClient();
      const userId = signInResult.user.id;
      const userRole = signInResult.user.user_metadata?.role || "firm_admin";
      const isClient = userRole.startsWith("client_");

      // Ensure profile exists
      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .single();

      if (!profile) {
        await admin.from("profiles").upsert(
          {
            id: userId,
            email: signInResult.user.email,
            full_name:
              signInResult.user.user_metadata?.full_name || email.split("@")[0],
            role: userRole,
          },
          { onConflict: "id" }
        );
      }

      return NextResponse.json({
        success: true,
        redirect: isClient ? "/portal" : "/dashboard",
        user: {
          id: userId,
          email: signInResult.user.email,
          role: userRole,
        },
      });
    }

    // Step 3: Sign-in failed — diagnose the cause
    const errorMsg = signInResult.error_description || signInResult.msg || "";

    // Check if user exists via profiles table (fast, no admin.listUsers)
    const admin = createAdminClient();

    const { data: profileMatch } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .limit(1);

    if (!profileMatch || profileMatch.length === 0) {
      return NextResponse.json(
        {
          error: "Aucun compte trouve avec cet email. Veuillez creer un compte.",
          code: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // User exists but password is wrong
    return NextResponse.json(
      {
        error: "Mot de passe incorrect. Utilisez 'Mot de passe oublie' pour le reinitialiser.",
        code: "WRONG_PASSWORD",
      },
      { status: 401 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erreur serveur, veuillez reessayer" },
      { status: 500 }
    );
  }
}
