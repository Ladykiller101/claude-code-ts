import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: "Configuration serveur manquante", code: "CONFIG_ERROR" },
        { status: 500 }
      );
    }

    // We build the response object first so @supabase/ssr can set cookies on it
    let response = NextResponse.json({ success: true }); // placeholder, replaced below
    const cookiesToSetLater: { name: string; value: string; options?: Record<string, unknown> }[] = [];

    // Create a Supabase server client that writes cookies to the response
    const supabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            cookiesToSetLater.push({ name, value, options: options as Record<string, unknown> });
          });
        },
      },
    });

    // Sign in using the SSR client — this will trigger setAll with auth cookies
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    const admin = createAdminClient();

    if (signInError || !signInData.user) {
      // Sign-in failed — diagnose the cause
      const { data: profileMatch } = await admin
        .from("profiles")
        .select("id")
        .eq("email", email.toLowerCase())
        .limit(1);

      if (!profileMatch || profileMatch.length === 0) {
        return NextResponse.json(
          {
            error:
              "Aucun compte trouve avec cet email. Veuillez creer un compte.",
            code: "USER_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      // User exists but password is wrong
      return NextResponse.json(
        {
          error:
            "Mot de passe incorrect. Utilisez 'Mot de passe oublie' pour le reinitialiser.",
          code: "WRONG_PASSWORD",
        },
        { status: 401 }
      );
    }

    // Sign-in succeeded
    const userId = signInData.user.id;
    const userRole =
      signInData.user.user_metadata?.role || "firm_admin";
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
          email: signInData.user.email,
          full_name:
            signInData.user.user_metadata?.full_name ||
            email.split("@")[0],
          role: userRole,
        },
        { onConflict: "id" }
      );
    }

    // Build the final response with the auth cookies baked in
    response = NextResponse.json({
      success: true,
      redirect: isClient ? "/portal" : "/dashboard",
      user: {
        id: userId,
        email: signInData.user.email,
        role: userRole,
      },
    });

    // Apply all auth cookies that @supabase/ssr collected during signIn
    for (const { name, value, options } of cookiesToSetLater) {
      response.cookies.set(name, value, {
        ...options,
        // Ensure cookies work for the whole site
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      } as never);
    }

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erreur serveur, veuillez reessayer", details: String(error) },
      { status: 500 }
    );
  }
}
