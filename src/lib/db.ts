import type {
  Client, Document, Task, Deadline, Invoice, Employee, HREvent,
  Ticket, TicketMessage, Appointment, Prospect, Automation, AuditLog,
  Message,
} from "@/types/database";

function createEntity<T extends { id: string }>(tableName: string) {
  return {
    async list(orderBy?: string): Promise<T[]> {
      const params = new URLSearchParams({ table: tableName });
      if (orderBy) {
        const desc = orderBy.startsWith("-");
        let field = desc ? orderBy.slice(1) : orderBy;
        if (field === "created_date") field = "created_at";
        if (field === "updated_date") field = "updated_at";
        params.set("orderBy", field);
        params.set("ascending", String(!desc));
      }

      const res = await fetch(`/api/query?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to fetch ${tableName}`);
      }
      return res.json();
    },

    async get(id: string): Promise<T> {
      const res = await fetch(`/api/query?table=${tableName}&id=${id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to fetch ${tableName}`);
      }
      return res.json();
    },

    async create(record: Partial<T>): Promise<T> {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _table: tableName, ...record }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to create ${tableName}`);
      }
      return res.json();
    },

    async update(id: string, record: Partial<T>): Promise<T> {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _table: tableName, _method: "update", _id: id, ...record }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to update ${tableName}`);
      }
      return res.json();
    },

    async delete(id: string): Promise<void> {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _table: tableName, _method: "delete", _id: id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to delete ${tableName}`);
      }
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
  messages: createEntity<Message>("messages"),
};
