export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: "firm_admin" | "accountant" | "payroll_manager" | "client_admin" | "client_hr" | "client_readonly";
  company_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  siret: string | null;
  type: string;
  status: "actif" | "prospect" | "inactif";
  address: string | null;
  notes: string | null;
  drive_folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  name: string;
  client_id: string | null;
  category: string;
  status: string;
  file_url: string | null;
  extracted_data: Record<string, unknown> | null;
  created_by: string | null;
  source: "upload" | "google_drive";
  drive_file_id: string | null;
  drive_web_view_link: string | null;
  drive_mime_type: string | null;
  drive_modified_time: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  assignee: string | null;
  assigned_to: string | null;
  priority: string;
  status: string;
  category: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Deadline {
  id: string;
  title: string;
  type: string;
  client_id: string | null;
  due_date: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  client_id: string | null;
  document_id: string | null;
  vendor_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  amount_ht: number | null;
  amount_tva: number | null;
  amount_ttc: number | null;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  contract_type: string;
  status: string;
  hire_date: string | null;
  salary: number | null;
  created_at: string;
  updated_at: string;
}

export interface HREvent {
  id: string;
  employee_id: string;
  client_id: string | null;
  event_type: string;
  start_date: string;
  end_date: string | null;
  duration_days: number | null;
  reason: string | null;
  supporting_doc_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  priority: string;
  category: string | null;
  status: string;
  created_by: string | null;
  last_message: string | null;
  source: string | null;
  chatbot_context: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_email: string;
  sender_role: string | null;
  sender_name: string | null;
  content: string;
  attachments: { name: string; url: string }[] | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  client_id: string | null;
  subject: string;
  appointment_type: string;
  scheduled_date: string;
  duration_minutes: number;
  location: string | null;
  meeting_url: string | null;
  status: string;
  requested_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Prospect {
  id: string;
  company: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  pipeline_stage: string;
  estimated_value: number | null;
  activities: unknown[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Automation {
  id: string;
  bot_name: string;
  description: string | null;
  type: string | null;
  status: string;
  tasks_completed: number;
  time_saved_minutes: number;
  last_run: string | null;
  schedule: string | null;
  success_rate: number;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  client_id: string;
  sender_id: string;
  sender_role: "firm_admin" | "accountant" | "payroll_manager" | "client_admin" | "client_hr" | "client_readonly";
  sender_name: string | null;
  sender_email: string | null;
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_email: string;
  client_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
