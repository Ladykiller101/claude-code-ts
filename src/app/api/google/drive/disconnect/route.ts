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
      .select("role, company_id")
      .eq("id", user.id)
      .single();

    return {
      id: user.id,
      role: profile?.role || user.user_metadata?.role || "client_readonly",
      company_id: profile?.company_id || null,
    };
  } catch {
    return null;
  }
}

// POST /api/google/drive/disconnect — Remove Google Drive connection from a client
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { clientId, removeSyncedDocs } = body as {
      clientId?: string;
      removeSyncedDocs?: boolean;
    };

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    // Verify the user is authorized
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isFirmUser = ["firm_admin", "accountant", "payroll_manager"].includes(user.role);
    const isClientUser = user.role.startsWith("client_");

    // Client users can only disconnect their own company
    if (isClientUser && user.company_id !== clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Must be either a firm user or a client user for their own company
    if (!isFirmUser && !isClientUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Clear the drive_folder_id from the client record
    const { error: updateError } = await supabase
      .from("clients")
      .update({ drive_folder_id: null })
      .eq("id", clientId);

    if (updateError) {
      throw new Error(`Failed to update client: ${updateError.message}`);
    }

    // Optionally remove all synced Drive documents from the documents table
    let removedCount = 0;
    if (removeSyncedDocs) {
      const { data: driveDocs } = await supabase
        .from("documents")
        .select("id")
        .eq("client_id", clientId)
        .eq("source", "google_drive");

      if (driveDocs && driveDocs.length > 0) {
        const ids = driveDocs.map((d) => d.id);
        const { error: deleteError } = await supabase
          .from("documents")
          .delete()
          .in("id", ids);

        if (deleteError) {
          console.error("Failed to remove synced docs:", deleteError.message);
        } else {
          removedCount = ids.length;
        }
      }
    }

    return NextResponse.json({
      success: true,
      clientId,
      removedDocuments: removedCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Disconnect failed";
    console.error("Drive disconnect error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
