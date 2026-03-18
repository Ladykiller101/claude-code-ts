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

    const admin = createAdminClient();

    // Step 1: Look up the user by email
    const { data: userLookup } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    const existingUser = userLookup?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    // Case A: User does not exist
    if (!existingUser) {
      return NextResponse.json(
        {
          error: "Aucun compte trouve avec cet email. Veuillez creer un compte.",
          code: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Case B: Email not confirmed — auto-confirm it
    if (!existingUser.email_confirmed_at) {
      const { error: confirmError } = await admin.auth.admin.updateUserById(
        existingUser.id,
        { email_confirm: true }
      );

      if (confirmError) {
        console.error("Failed to auto-confirm user:", confirmError);
        return NextResponse.json(
          {
            error: "Votre email n'etait pas confirme. Veuillez contacter l'administrateur.",
            code: "EMAIL_NOT_CONFIRMED",
          },
          { status: 403 }
        );
      }
    }

    // Step 2: Verify the password using a temporary admin-created sign-in
    // We use the admin client to generate a link, which validates the user exists
    // Then we attempt sign-in with the Supabase REST API directly to validate password
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

    if (!signInResponse.ok || signInResult.error) {
      return NextResponse.json(
        {
          error: "Mot de passe incorrect. Utilisez 'Mot de passe oublie' pour le reinitialiser.",
          code: "WRONG_PASSWORD",
        },
        { status: 401 }
      );
    }

    // Step 3: Sign-in succeeded — ensure profile exists
    const userId = signInResult.user?.id || existingUser.id;

    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (!profile) {
      await admin.from("profiles").upsert(
        {
          id: userId,
          email: existingUser.email,
          full_name:
            existingUser.user_metadata?.full_name || email.split("@")[0],
          role: existingUser.user_metadata?.role || "firm_admin",
        },
        { onConflict: "id" }
      );
    }

    const userRole = existingUser.user_metadata?.role || "firm_admin";
    const isClient = userRole.startsWith("client_");

    // Return success + the action for the client to perform sign-in client-side
    return NextResponse.json({
      success: true,
      redirect: isClient ? "/portal" : "/dashboard",
      autoConfirmed: !existingUser.email_confirmed_at,
      user: {
        id: userId,
        email: existingUser.email,
        role: userRole,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erreur serveur, veuillez reessayer" },
      { status: 500 }
    );
  }
}
