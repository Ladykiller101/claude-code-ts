import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// GET /api/debug/check-data — Diagnose data access issues
export async function GET() {
  const results: Record<string, unknown> = {};

  try {
    // 1. Check admin access (bypasses RLS)
    const admin = createAdminClient();

    const tables = ["profiles", "clients", "documents", "tasks", "deadlines", "invoices"];
    for (const table of tables) {
      const { data, error, count } = await admin
        .from(table)
        .select("*", { count: "exact", head: false })
        .limit(1);
      results[`admin_${table}`] = {
        count: data?.length ?? 0,
        totalCount: count,
        error: error?.message || null,
        errorCode: error?.code || null,
      };
    }

    // 2. Check if RLS functions exist
    const { data: fnCheck, error: fnError } = await admin.rpc("get_user_role").select();
    results.rls_function_get_user_role = {
      exists: !fnError || fnError.code !== "PGRST202",
      error: fnError?.message || null,
      errorCode: fnError?.code || null,
    };

    // 3. Check user session
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      results.auth_user = null;
      results.config_error = "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY";
      return NextResponse.json(results, { status: 200 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    results.auth_user = user ? { id: user.id, email: user.email } : null;

    // 4. Check profile exists for this user
    if (user) {
      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      results.user_profile = {
        exists: !!profile,
        role: profile?.role || null,
        error: profileError?.message || null,
      };

      // 5. Test RLS access with anon key (as the user would)
      const { data: clientsAnon, error: clientsError } = await supabase
        .from("clients")
        .select("id")
        .limit(1);
      results.rls_clients_access = {
        count: clientsAnon?.length ?? 0,
        error: clientsError?.message || null,
        errorCode: clientsError?.code || null,
      };
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message, results }, { status: 500 });
  }
}
