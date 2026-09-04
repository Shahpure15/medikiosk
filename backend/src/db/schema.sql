-- Extension for fuzzy medicine search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============ ORG ============
CREATE TABLE IF NOT EXISTS hospitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  registration_mode TEXT CHECK (registration_mode IN ('admin_creates','self_register_approval')) DEFAULT 'admin_creates',
  physical_presence_required BOOLEAN DEFAULT true, -- If true, remote intake requires scanning Kiosk QR presence proof
  address TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- ============ RBAC ============
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE, -- NULL = platform-level (super admin)
  name TEXT NOT NULL,
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL -- 'patients','cases','staff','roles','hospitals','reports','documents'
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  action TEXT CHECK (action IN ('create','read','update','delete','approve')),
  UNIQUE(role_id, module_id, action)
);

-- ============ USERS (staff + admins) ============
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE, -- NULL for super admin
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  password_hash TEXT NOT NULL,
  status TEXT CHECK (status IN ('active','pending_approval','suspended')) DEFAULT 'active',
  abha_id TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registration_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  requested_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doctor_room_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  assignment_date DATE NOT NULL,
  UNIQUE(doctor_id, assignment_date)
);

-- ============ PATIENT IDENTITY ============
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  abha_id TEXT NULL,
  name TEXT,
  age INT,
  gender TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(hospital_id, phone)
);

CREATE TABLE IF NOT EXISTS patient_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  language_pref TEXT DEFAULT 'en',
  status TEXT CHECK (status IN ('active','completed','expired')) DEFAULT 'active',
  is_kiosk_verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kiosk_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id REFERENCES hospitals(id) ON DELETE CASCADE,
  location_label TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS kiosk_verification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kiosk_device_id UUID REFERENCES kiosk_devices(id) ON DELETE CASCADE,
  session_id UUID REFERENCES patient_sessions(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ CASE / INTAKE ============
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES patient_sessions(id) ON DELETE SET NULL,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  department_resolved_by TEXT CHECK (department_resolved_by IN ('patient_selected','auto_routed')) NULL,
  chief_complaint TEXT,
  status TEXT CHECK (status IN ('intake','ready_for_doctor','in_consult','completed')) DEFAULT 'intake',
  assigned_doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS question_flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL, -- NULL = generic/triage flow
  version INT DEFAULT 1,
  tree JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS department_routing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  symptom_tag TEXT NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  priority INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS case_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  answer_type TEXT CHECK (answer_type IN ('voice','touch')) DEFAULT 'touch',
  raw_audio_ref TEXT NULL,
  extracted_via_llm BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  session_id UUID REFERENCES patient_sessions(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  ocr_text TEXT,
  doc_type TEXT CHECK (doc_type IN ('prescription','report','id_proof','other')) DEFAULT 'report',
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ QUEUE ============
CREATE TABLE IF NOT EXISTS tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  token_date DATE NOT NULL,
  token_number INT NOT NULL,
  status TEXT CHECK (status IN
    ('waiting','called','in_consult','completed','no_show','carried_forward','flushed')) DEFAULT 'waiting',
  priority BOOLEAN DEFAULT false,
  room_number TEXT NULL,
  carried_from_token_id UUID REFERENCES tokens(id) ON DELETE SET NULL,
  rsvp_status TEXT CHECK (rsvp_status IN ('pending','confirmed','declined')) NULL,
  called_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ PRESCRIPTIONS ============
CREATE TABLE IF NOT EXISTS medicines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  generic_name TEXT,
  form TEXT,             -- tablet / syrup / capsule / injection / topical
  strength TEXT          -- e.g. '500mg'
);

-- Index for typo-tolerant fuzzy search
CREATE INDEX IF NOT EXISTS medicines_name_trgm ON medicines USING GIN (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  remarks TEXT,
  next_checkup_date DATE NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prescription_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES medicines(id) ON DELETE CASCADE,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  timing TEXT CHECK (timing IN ('before_food','after_food','with_food','anytime')) DEFAULT 'after_food',
  duration_days INT NOT NULL,
  notes TEXT NULL
);

-- ============ AUDIT ============
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
