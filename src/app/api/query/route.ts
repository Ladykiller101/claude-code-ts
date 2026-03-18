import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TABLES = [
  "clients", "documents", "tasks", "deadlines", "invoices",
  "employees", "hr_events", "tickets", "ticket_messages",
  "appointments", "prospects", "automations", "audit_logs",
  "messages",
];

// Tables where DELETE operations are blocked for data integrity
const DELETE_BLOCKED_TABLES = [
  "tickets", "ticket_messages", "messages",
];

// Tables that have a client_id column for filtering
// NOTE: ticket_messages does NOT have client_id — it is scoped via ticket_id -> tickets.client_id
const CLIENT_SCOPED_TABLES = [
  "documents", "tasks", "deadlines", "invoices",
  "employees", "hr_events", "tickets",
  "appointments", "messages",
];

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

function isClientRole(role: string) {
  return role.startsWith("client_");
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const table = searchParams.get("table");
    const orderBy = searchParams.get("orderBy") || "created_at";
    const ascending = searchParams.get("ascending") === "true";
    const id = searchParams.get("id");
    const filterTicketId = searchParams.get("filter_ticket_id");

    if (!table || !ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: "Invalid table" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const user = await getCurrentUser();

    // Enforce authentication — unauthenticated requests get 401
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Client users: restrict to their own data
    const isClient = isClientRole(user.role);
    const clientId = user.company_id;

    if (id) {
      let query = supabase.from(table).select("*").eq("id", id);

      // Client can only access their own records
      if (isClient && clientId && CLIENT_SCOPED_TABLES.includes(table)) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query.single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    let query = supabase.from(table).select("*");

    // Client users: filter by their company_id
    if (isClient && CLIENT_SCOPED_TABLES.includes(table)) {
      if (clientId) {
        query = query.eq("client_id", clientId);
      } else {
        // Client has no company_id set — return empty
        return NextResponse.json([]);
      }
    }

    // ticket_messages: client users can only see messages for their own tickets
    if (isClient && table === "ticket_messages") {
      if (clientId) {
        // Get ticket IDs belonging to this client first
        const { data: clientTickets } = await supabase
          .from("tickets")
          .select("id")
          .eq("client_id", clientId);
        const ticketIds = (clientTickets || []).map((t: { id: string }) => t.id);
        if (ticketIds.length === 0) return NextResponse.json([]);
        query = query.in("ticket_id", ticketIds);
      } else {
        return NextResponse.json([]);
      }
    }

    // ticket_messages: filter by ticket_id if provided (efficient server-side filtering)
    if (table === "ticket_messages" && filterTicketId) {
      query = query.eq("ticket_id", filterTicketId);
    }

    // Client users should not see the full clients list
    if (isClient && table === "clients") {
      if (clientId) {
        query = query.eq("id", clientId);
      } else {
        return NextResponse.json([]);
      }
    }

    query = query.order(orderBy, { ascending });

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Query failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { _table, _method, _id, ...record } = body;

    if (!_table || !ALLOWED_TABLES.includes(_table)) {
      return NextResponse.json({ error: "Invalid table" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const user = await getCurrentUser();

    // Enforce authentication
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isClient = isClientRole(user.role);

    // Block delete operations on protected tables
    if (_method === "delete" && DELETE_BLOCKED_TABLES.includes(_table)) {
      return NextResponse.json(
        { error: "Delete operations are not permitted on this table" },
        { status: 403 }
      );
    }

    // Client users: force client_id on mutations
    if (isClient && user?.company_id && CLIENT_SCOPED_TABLES.includes(_table)) {
      record.client_id = user.company_id;
    }

    // ticket_messages: validate client can only insert messages for their own tickets
    if (isClient && _table === "ticket_messages" && record.ticket_id) {
      const { data: ticket } = await supabase
        .from("tickets")
        .select("client_id")
        .eq("id", record.ticket_id)
        .single();
      if (!ticket || (user?.company_id && ticket.client_id !== user.company_id)) {
        return NextResponse.json({ error: "Not authorized to post to this ticket" }, { status: 403 });
      }
    }

    if (_method === "update" && _id) {
      let query = supabase.from(_table).update(record).eq("id", _id);

      // Client can only update their own records
      if (isClient && user?.company_id && CLIENT_SCOPED_TABLES.includes(_table)) {
        query = query.eq("client_id", user.company_id);
      }

      const { data, error } = await query.select().single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    if (_method === "delete" && _id) {
      let query = supabase.from(_table).delete().eq("id", _id);

      if (isClient && user?.company_id && CLIENT_SCOPED_TABLES.includes(_table)) {
        query = query.eq("client_id", user.company_id);
      }

      const { error } = await query;
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // Default: insert
    const { data, error } = await supabase
      .from(_table)
      .insert(record)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mutation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
