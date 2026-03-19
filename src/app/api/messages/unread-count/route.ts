import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function isClientRole(role: string) {
  return role.startsWith("client_");
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ count: 0 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role, company_id")
      .eq("id", user.id)
      .single();

    const role = profile?.role || user.user_metadata?.role || "client_readonly";
    const isClient = isClientRole(role);

    let query = admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .is("read_at", null)
      .neq("sender_id", user.id);

    if (isClient) {
      // Client users: count unread messages for their company only
      // (messages sent by firm users that the client hasn't read)
      const companyId = profile?.company_id;
      if (!companyId) {
        return NextResponse.json({ count: 0 });
      }
      query = query.eq("client_id", companyId);
    }
    // Firm users: count ALL unread messages across all clients
    // (messages sent by client users that firm hasn't read)

    const { count, error } = await query;

    if (error) {
      console.error("Unread count error:", error);
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
