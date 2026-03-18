import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id, role, company_id, full_name, email")
      .eq("id", user.id)
      .single();

    return {
      id: user.id,
      role: profile?.role || user.user_metadata?.role || "client_readonly",
      company_id: profile?.company_id || null,
      full_name: profile?.full_name || user.user_metadata?.full_name || null,
      email: profile?.email || user.email || null,
    };
  } catch {
    return null;
  }
}

function isClientRole(role: string) {
  return role.startsWith("client_");
}

// POST /api/messages — send a message
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { client_id, content } = body;

    if (!client_id || !content?.trim()) {
      return NextResponse.json(
        { error: "client_id and content are required" },
        { status: 400 }
      );
    }

    // Client users can only send messages scoped to their own company
    if (isClientRole(user.role)) {
      if (user.company_id !== client_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("messages")
      .insert({
        client_id,
        sender_id: user.id,
        sender_role: user.role,
        sender_name: user.full_name,
        sender_email: user.email,
        content: content.trim(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/messages — mark messages as read
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { client_id } = body;

    if (!client_id) {
      return NextResponse.json(
        { error: "client_id is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Mark unread messages as read — only those NOT sent by the current user.
    // This way: firm users mark client messages as read, clients mark firm messages as read.
    const { error } = await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("client_id", client_id)
      .is("read_at", null)
      .neq("sender_id", user.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark as read";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
