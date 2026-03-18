import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    // Step 1: Attempt the sign-in using a server client that sets cookies
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server Component — ignore
            }
          },
        },
      }
    );

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    // Step 2: If sign-in succeeded, ensure profile and return success
    if (!signInError && signInData?.user) {
      const admin = createAdminClient();
      const userId = signInData.user.id;

      // Ensure profile exists (some users were created before the trigger was fixed)
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
            role: signInData.user.user_metadata?.role || "firm_admin",
          },
          { onConflict: "id" }
        );
      }

      const userRole = signInData.user.user_metadata?.role || "firm_admin";
      const isClient = userRole.startsWith("client_");

      return NextResponse.json({
        success: true,
        redirect: isClient ? "/portal" : "/dashboard",
        user: {
          id: signInData.user.id,
          email: signInData.user.email,
          role: userRole,
        },
      });
    }

    // Step 3: Sign-in failed — diagnose the real cause using admin API
    const admin = createAdminClient();

    // Look up the user by email in auth.users via admin
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

    // Case B: Email not confirmed
    if (!existingUser.email_confirmed_at) {
      // Auto-confirm the user via admin API since we control this instance
      const { error: confirmError } = await admin.auth.admin.updateUserById(
        existingUser.id,
        { email_confirm: true }
      );

      if (confirmError) {
        console.error("Failed to auto-confirm user:", confirmError);
        return NextResponse.json(
          {
            error:
              "Votre email n'etait pas confirme. Veuillez contacter l'administrateur.",
            code: "EMAIL_NOT_CONFIRMED",
          },
          { status: 403 }
        );
      }

      // Email now confirmed — retry login
      const { data: retryData, error: retryError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (retryError) {
        return NextResponse.json(
          {
            error:
              "Votre email a ete confirme mais le mot de passe est incorrect. Utilisez 'Mot de passe oublie' pour le reinitialiser.",
            code: "WRONG_PASSWORD_AFTER_CONFIRM",
          },
          { status: 401 }
        );
      }

      if (retryData?.user) {
        const userRole = retryData.user.user_metadata?.role || "firm_admin";
        const isClient = userRole.startsWith("client_");

        // Ensure profile exists
        const { data: profile } = await admin
          .from("profiles")
          .select("id")
          .eq("id", retryData.user.id)
          .single();

        if (!profile) {
          await admin.from("profiles").upsert(
            {
              id: retryData.user.id,
              email: retryData.user.email,
              full_name:
                retryData.user.user_metadata?.full_name ||
                email.split("@")[0],
              role: userRole,
            },
            { onConflict: "id" }
          );
        }

        return NextResponse.json({
          success: true,
          redirect: isClient ? "/portal" : "/dashboard",
          user: {
            id: retryData.user.id,
            email: retryData.user.email,
            role: userRole,
          },
        });
      }
    }

    // Case C: User exists and email is confirmed — wrong password
    return NextResponse.json(
      {
        error:
          "Mot de passe incorrect. Utilisez 'Mot de passe oublie' pour le reinitialiser.",
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
