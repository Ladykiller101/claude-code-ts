-- =============================================
-- FinFlow SYGMA Conseils — Complete Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- PROFILES (extends Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'client_readonly'
    CHECK (role IN ('firm_admin', 'accountant', 'payroll_manager', 'client_admin', 'client_hr', 'client_readonly')),
  company_id UUID,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CLIENTS
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  siret TEXT,
  type TEXT DEFAULT 'SARL'
    CHECK (type IN ('SARL', 'SAS', 'SASU', 'SA', 'SCI', 'EI', 'auto_entrepreneur', 'association', 'autre')),
  status TEXT DEFAULT 'prospect'
    CHECK (status IN ('actif', 'prospect', 'inactif')),
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ADD CONSTRAINT fk_profiles_company
  FOREIGN KEY (company_id) REFERENCES clients(id) ON DELETE SET NULL;

-- DOCUMENTS
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  category TEXT DEFAULT 'autre'
    CHECK (category IN ('facture', 'devis', 'contrat', 'bulletin_paie', 'declaration_fiscale', 'releve_bancaire', 'autre')),
  status TEXT DEFAULT 'en_attente'
    CHECK (status IN ('en_attente', 'traité', 'validé', 'rejeté')),
  file_url TEXT,
  extracted_data JSONB,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TASKS
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  assignee TEXT,
  priority TEXT DEFAULT 'moyenne'
    CHECK (priority IN ('urgente', 'haute', 'moyenne', 'basse')),
  status TEXT DEFAULT 'à_faire'
    CHECK (status IN ('à_faire', 'en_cours', 'en_attente_client', 'terminée')),
  category TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DEADLINES
CREATE TABLE deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL
    CHECK (type IN ('TVA', 'IS', 'CFE', 'CVAE', 'liasse_fiscale', 'DSN', 'bilan', 'autre')),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'à_venir'
    CHECK (status IN ('à_venir', 'en_cours', 'terminée')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INVOICES
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  vendor_name TEXT,
  invoice_number TEXT,
  invoice_date DATE,
  due_date DATE,
  amount_ht NUMERIC(12,2),
  amount_tva NUMERIC(12,2),
  amount_ttc NUMERIC(12,2),
  category TEXT DEFAULT 'achat'
    CHECK (category IN ('achat', 'vente', 'frais_généraux', 'immobilisation')),
  status TEXT DEFAULT 'à_traiter'
    CHECK (status IN ('à_traiter', 'comptabilisée', 'payée')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EMPLOYEES
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  contract_type TEXT DEFAULT 'CDI'
    CHECK (contract_type IN ('CDI', 'CDD', 'stage', 'alternance', 'freelance')),
  status TEXT DEFAULT 'actif'
    CHECK (status IN ('actif', 'conge', 'maladie', 'inactif')),
  hire_date DATE,
  salary NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- HR_EVENTS
CREATE TABLE hr_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('conge_paye', 'conge_sans_solde', 'arret_maladie', 'accident_travail', 'maternite', 'paternite', 'formation', 'teletravail', 'absence', 'depart', 'autre')),
  start_date DATE NOT NULL,
  end_date DATE,
  duration_days INTEGER,
  reason TEXT,
  supporting_doc_url TEXT,
  status TEXT DEFAULT 'en_attente'
    CHECK (status IN ('en_attente', 'approuvé', 'refusé')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TICKETS
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'normale'
    CHECK (priority IN ('urgente', 'haute', 'normale', 'basse')),
  category TEXT,
  status TEXT DEFAULT 'nouveau'
    CHECK (status IN ('nouveau', 'en_cours', 'attente_client', 'résolu', 'fermé')),
  created_by TEXT,
  last_message TEXT,
  source TEXT,
  chatbot_context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TICKET_MESSAGES
CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  sender_role TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- APPOINTMENTS
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  appointment_type TEXT DEFAULT 'conseil'
    CHECK (appointment_type IN ('bilan_annuel', 'paie', 'urgent', 'onboarding', 'conseil')),
  scheduled_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  location TEXT,
  meeting_url TEXT,
  status TEXT DEFAULT 'demande'
    CHECK (status IN ('demande', 'confirme', 'annule', 'termine')),
  requested_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROSPECTS
CREATE TABLE prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  pipeline_stage TEXT DEFAULT 'contact_initial'
    CHECK (pipeline_stage IN ('contact_initial', 'proposition', 'négociation', 'signature', 'perdu')),
  estimated_value NUMERIC(12,2),
  activities JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUTOMATIONS
CREATE TABLE automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_name TEXT NOT NULL,
  description TEXT,
  type TEXT,
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'error')),
  tasks_completed INTEGER DEFAULT 0,
  time_saved_minutes INTEGER DEFAULT 0,
  last_run TIMESTAMPTZ,
  schedule TEXT,
  success_rate NUMERIC(5,2) DEFAULT 100.0,
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUDIT_LOGS
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_documents_client_id ON documents(client_id);
CREATE INDEX idx_tasks_client_id ON tasks(client_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_deadlines_due_date ON deadlines(due_date);
CREATE INDEX idx_deadlines_client_id ON deadlines(client_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_employees_client_id ON employees(client_id);
CREATE INDEX idx_hr_events_employee_id ON hr_events(employee_id);
CREATE INDEX idx_tickets_client_id ON tickets(client_id);
CREATE INDEX idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX idx_appointments_client_id ON appointments(client_id);
CREATE INDEX idx_audit_logs_user_email ON audit_logs(user_email);
CREATE INDEX idx_profiles_company_id ON profiles(company_id);

-- =============================================
-- AUTO updated_at TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'profiles','clients','documents','tasks','deadlines','invoices',
    'employees','hr_events','tickets','appointments','prospects','automations'
  ]) LOOP
    EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t, t);
  END LOOP;
END
$$;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE((SELECT role FROM profiles WHERE id = auth.uid()), 'client_readonly');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_firm_user()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('firm_admin', 'accountant', 'payroll_manager');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES
CREATE POLICY "Users see own profile" ON profiles FOR SELECT USING (id = auth.uid() OR is_firm_user());
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (id = auth.uid());

-- CLIENTS
CREATE POLICY "Firm users full access clients" ON clients FOR ALL USING (is_firm_user());
CREATE POLICY "Client users see own company" ON clients FOR SELECT USING (id = get_user_company_id());

-- DOCUMENTS
CREATE POLICY "Firm users full access documents" ON documents FOR ALL USING (is_firm_user());
CREATE POLICY "Clients see own documents" ON documents FOR SELECT USING (client_id = get_user_company_id());
CREATE POLICY "Clients insert documents" ON documents FOR INSERT WITH CHECK (client_id = get_user_company_id());

-- TASKS
CREATE POLICY "Firm users full access tasks" ON tasks FOR ALL USING (is_firm_user());
CREATE POLICY "Clients see own tasks" ON tasks FOR SELECT USING (client_id = get_user_company_id());

-- DEADLINES
CREATE POLICY "Firm users full access deadlines" ON deadlines FOR ALL USING (is_firm_user());
CREATE POLICY "Clients see own deadlines" ON deadlines FOR SELECT USING (client_id = get_user_company_id() OR client_id IS NULL);

-- INVOICES
CREATE POLICY "Firm users full access invoices" ON invoices FOR ALL USING (is_firm_user());
CREATE POLICY "Clients see own invoices" ON invoices FOR SELECT USING (client_id = get_user_company_id());

-- EMPLOYEES
CREATE POLICY "Firm users full access employees" ON employees FOR ALL USING (is_firm_user());
CREATE POLICY "Client admins manage employees" ON employees FOR ALL USING (client_id = get_user_company_id() AND get_user_role() IN ('client_admin', 'client_hr'));
CREATE POLICY "Client readonly see employees" ON employees FOR SELECT USING (client_id = get_user_company_id());

-- HR_EVENTS
CREATE POLICY "Firm users full access hr_events" ON hr_events FOR ALL USING (is_firm_user());
CREATE POLICY "Client hr manages hr_events" ON hr_events FOR ALL USING (client_id = get_user_company_id() AND get_user_role() IN ('client_admin', 'client_hr'));
CREATE POLICY "Client readonly see hr_events" ON hr_events FOR SELECT USING (client_id = get_user_company_id());

-- TICKETS
CREATE POLICY "Firm users full access tickets" ON tickets FOR ALL USING (is_firm_user());
CREATE POLICY "Clients manage own tickets" ON tickets FOR ALL USING (client_id = get_user_company_id());

-- TICKET_MESSAGES
CREATE POLICY "Access through ticket" ON ticket_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM tickets t WHERE t.id = ticket_id AND (is_firm_user() OR t.client_id = get_user_company_id()))
);

-- APPOINTMENTS
CREATE POLICY "Firm users full access appointments" ON appointments FOR ALL USING (is_firm_user());
CREATE POLICY "Clients manage own appointments" ON appointments FOR ALL USING (client_id = get_user_company_id());

-- PROSPECTS
CREATE POLICY "Firm users full access prospects" ON prospects FOR ALL USING (is_firm_user());

-- AUTOMATIONS
CREATE POLICY "Firm admin manages automations" ON automations FOR ALL USING (get_user_role() = 'firm_admin');
CREATE POLICY "Firm users see automations" ON automations FOR SELECT USING (is_firm_user());

-- AUDIT_LOGS
CREATE POLICY "Firm users see audit logs" ON audit_logs FOR SELECT USING (is_firm_user());
CREATE POLICY "Anyone inserts audit logs" ON audit_logs FOR INSERT WITH CHECK (true);

-- =============================================
-- REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client_readonly')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
