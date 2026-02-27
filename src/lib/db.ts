import { createClient } from "@/lib/supabase/client";
import type {
  Client, Document, Task, Deadline, Invoice, Employee, HREvent,
  Ticket, TicketMessage, Appointment, Prospect, Automation, AuditLog,
} from "@/types/database";

function createEntity<T extends { id: string }>(tableName: string) {
  return {
    async list(orderBy?: string): Promise<T[]> {
      const supabase = createClient();
      let query = supabase.from(tableName).select("*");

      if (orderBy) {
        const desc = orderBy.startsWith("-");
        let field = desc ? orderBy.slice(1) : orderBy;
        // Map Base44 field names to Supabase
        if (field === "created_date") field = "created_at";
        if (field === "updated_date") field = "updated_at";
        query = query.order(field, { ascending: !desc });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as T[];
    },

    async get(id: string): Promise<T> {
      const supabase = createClient();
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as T;
    },

    async create(record: Partial<T>): Promise<T> {
      const supabase = createClient();
      const { data, error } = await supabase
        .from(tableName)
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data as T;
    },

    async update(id: string, record: Partial<T>): Promise<T> {
      const supabase = createClient();
      const { data, error } = await supabase
        .from(tableName)
        .update(record)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as T;
    },

    async delete(id: string): Promise<void> {
      const supabase = createClient();
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
  };
}

export const db = {
  clients: createEntity<Client>("clients"),
  documents: createEntity<Document>("documents"),
  tasks: createEntity<Task>("tasks"),
  deadlines: createEntity<Deadline>("deadlines"),
  invoices: createEntity<Invoice>("invoices"),
  employees: createEntity<Employee>("employees"),
  hrEvents: createEntity<HREvent>("hr_events"),
  tickets: createEntity<Ticket>("tickets"),
  ticketMessages: createEntity<TicketMessage>("ticket_messages"),
  appointments: createEntity<Appointment>("appointments"),
  prospects: createEntity<Prospect>("prospects"),
  automations: createEntity<Automation>("automations"),
  auditLogs: createEntity<AuditLog>("audit_logs"),
};
