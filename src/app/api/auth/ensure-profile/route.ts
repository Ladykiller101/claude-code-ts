import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// POST /api/auth/ensure-profile — Create profile if it doesn't exist
export async function POST() {
  try {
    // Get the current user from the session
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Use admin client to bypass RLS
    const admin = createAdminClient();

    // Check if profile exists
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (existing) {
      // Profile exists, return it
      const { data: profile } = await admin
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      return NextResponse.json({ profile, created: false });
    }

    // Create profile
    const profile = {
      id: user.id,
      email: user.email || "",
      full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "",
      role: user.user_metadata?.role || "firm_admin",
      company_id: null,
      avatar_url: null,
    };

    const { data: created, error } = await admin
      .from("profiles")
      .insert(profile)
      .select()
      .single();

    if (error) {
      console.error("Profile creation error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile: created, created: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
