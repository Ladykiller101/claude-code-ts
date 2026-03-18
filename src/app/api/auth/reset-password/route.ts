import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email requis" },
        { status: 400 }
      );
    }

    // Use the standard client (not admin) to send password reset email
    // This respects Supabase's built-in email templates
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`,
    });

    if (error) {
      console.error("Password reset error:", error);
      // Don't reveal whether the email exists or not (security)
      return NextResponse.json({
        success: true,
        message:
          "Si un compte existe avec cet email, un lien de reinitialisation a ete envoye.",
      });
    }

    // Also auto-confirm the user if they weren't confirmed (so they can log in after reset)
    const admin = createAdminClient();
    const { data: usersByEmail } = await admin.auth.admin.listUsers();
    const existingUser = usersByEmail?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser && !existingUser.email_confirmed_at) {
      await admin.auth.admin.updateUserById(existingUser.id, {
        email_confirm: true,
      });
    }

    return NextResponse.json({
      success: true,
      message:
        "Si un compte existe avec cet email, un lien de reinitialisation a ete envoye.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
