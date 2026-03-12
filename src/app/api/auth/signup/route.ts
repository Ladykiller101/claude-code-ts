import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name, role } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Create the user in auth.users
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // auto-confirm so they can log in immediately
        user_metadata: { full_name, role },
      });

    if (authError) {
      // Handle duplicate email
      if (authError.message.includes("already been registered")) {
        return NextResponse.json(
          { error: "Cet email est deja utilise" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Erreur lors de la creation du compte" },
        { status: 500 }
      );
    }

    // Manually create the profile (bypasses the broken trigger)
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: authData.user.id,
        email: authData.user.email,
        full_name: full_name || email.split("@")[0],
        role: role || "client_readonly",
      },
      { onConflict: "id" }
    );

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // User is created but profile failed — not critical, AuthProvider handles this
    }

    return NextResponse.json({
      success: true,
      user: { id: authData.user.id, email: authData.user.email },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
