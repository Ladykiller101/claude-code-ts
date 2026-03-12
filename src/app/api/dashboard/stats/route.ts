import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/dashboard/data — Fetch all dashboard data server-side
export async function GET() {
  try {
    const supabase = createAdminClient();

    const [clients, documents, tasks, deadlines, invoices] = await Promise.all([
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase.from("documents").select("*").order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("deadlines").select("*").order("created_at", { ascending: false }),
      supabase.from("invoices").select("*").order("created_at", { ascending: false }),
    ]);

    return NextResponse.json({
      clients: clients.data ?? [],
      documents: documents.data ?? [],
      tasks: tasks.data ?? [],
      deadlines: deadlines.data ?? [],
      invoices: invoices.data ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
