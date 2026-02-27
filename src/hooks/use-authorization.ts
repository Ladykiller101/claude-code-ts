"use client";

import { useAuth } from "@/lib/auth-context";

const PERMISSIONS: Record<string, string[]> = {
  client_admin: [
    "view_portal", "create_tickets", "view_tickets", "manage_employees",
    "create_hr_events", "book_appointments", "view_documents", "upload_documents",
    "use_chatbot", "export_data",
  ],
  client_hr: [
    "view_portal", "create_tickets", "view_tickets", "manage_employees",
    "create_hr_events", "view_documents", "upload_documents", "use_chatbot",
  ],
  client_readonly: [
    "view_portal", "view_tickets", "view_documents", "use_chatbot",
  ],
  accountant: [
    "view_dashboard", "view_all_clients", "manage_tickets", "view_employees",
    "view_hr_events", "manage_appointments", "view_documents", "view_analytics",
  ],
  payroll_manager: [
    "view_dashboard", "view_all_clients", "view_tickets", "view_employees",
    "manage_hr_events", "view_documents",
  ],
  firm_admin: ["all"],
};

export function useAuthorization() {
  const { user } = useAuth();
  const role = user?.role || "firm_admin";

  const can = (action: string): boolean => {
    const perms = PERMISSIONS[role] || [];
    return perms.includes("all") || perms.includes(action);
  };

  const isClientRole = role.startsWith("client_");
  const isFirmRole = !isClientRole;

  return { can, role, isClientRole, isFirmRole };
}
