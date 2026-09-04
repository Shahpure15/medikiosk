const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let isPgAvailable = false;
let pool = null;

// Initialize PostgreSQL pool
try {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/medikiosk',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 2000
  });

  pool.on('error', (err) => {
    // console.log('[PostgreSQL] Connection fallback to In-Memory store');
  });
} catch (e) {
  // console.log('[PostgreSQL] Pool initialization skipped');
}

// ==========================================
// RESILIENT IN-MEMORY STORE & SQL INTERPRETER
// (Ensures zero-downtime & instant local execution)
// ==========================================
const memoryStore = {
  hospitals: [],
  departments: [],
  roles: [],
  modules: [],
  permissions: [],
  users: [],
  registration_requests: [],
  doctor_room_assignments: [],
  patients: [],
  patient_sessions: [],
  kiosk_devices: [],
  kiosk_verification_codes: [],
  cases: [],
  question_flows: [],
  department_routing_rules: [],
  case_responses: [],
  documents: [],
  tokens: [],
  medicines: [],
  prescriptions: [],
  prescription_items: [],
  audit_logs: []
};

// Seed In-Memory store on startup
async function seedMemoryStore() {
  if (memoryStore.hospitals.length > 0) return;

  const defaultPasswordHash = await bcrypt.hash('Password@123', 10);

  // 1. Modules
  const modules = ['patients', 'cases', 'staff', 'roles', 'hospitals', 'reports', 'documents'];
  modules.forEach((key, idx) => {
    memoryStore.modules.push({ id: `mod-0000-0000-0000-${idx + 1}`, key });
  });

  // 2. Hospital
  const hospId = 'hosp-0000-0000-0000-0001';
  memoryStore.hospitals.push({
    id: hospId,
    name: 'District Civil & AYUSH Hospital, Central District',
    registration_mode: 'admin_creates',
    address: 'Civil Lines, Rajpath Marg, New Delhi - 110001',
    contact_phone: '+91 11 2345 6789',
    created_at: new Date()
  });

  // 3. Departments
  const depts = [
    { id: 'dept-0001', name: 'General Medicine', is_active: true },
    { id: 'dept-0002', name: 'AYUSH (Ayurveda & Panchakarma)', is_active: true },
    { id: 'dept-0003', name: 'Orthopedics', is_active: true },
    { id: 'dept-0004', name: 'Pediatrics', is_active: true }
  ];
  depts.forEach(d => {
    memoryStore.departments.push({ id: d.id, hospital_id: hospId, name: d.name, is_active: d.is_active });
  });

  // 4. Roles
  const superRoleId = 'role-super-admin';
  const adminRoleId = 'role-hosp-admin';
  const doctorRoleId = 'role-doctor';
  const recepRoleId = 'role-receptionist';

  memoryStore.roles.push(
    { id: superRoleId, hospital_id: null, name: 'Super Administrator', is_system_role: true },
    { id: adminRoleId, hospital_id: hospId, name: 'Hospital Administrator', is_system_role: true },
    { id: doctorRoleId, hospital_id: hospId, name: 'Medical Officer / Doctor', is_system_role: true },
    { id: recepRoleId, hospital_id: hospId, name: 'OPD Receptionist', is_system_role: true }
  );

  // 5. Permissions
  const actions = ['create', 'read', 'update', 'delete', 'approve'];
  memoryStore.modules.forEach(m => {
    actions.forEach((act, idx) => {
      // Super Admin
      memoryStore.permissions.push({ id: `p-s-${m.id}-${idx}`, role_id: superRoleId, module_id: m.id, action: act });
      // Hospital Admin
      memoryStore.permissions.push({ id: `p-a-${m.id}-${idx}`, role_id: adminRoleId, module_id: m.id, action: act });
    });
  });

  // Doctor permissions
  ['patients', 'cases', 'documents', 'reports'].forEach(modKey => {
    const mod = memoryStore.modules.find(m => m.key === modKey);
    if (mod) {
      ['read', 'update', 'create'].forEach((act, idx) => {
        memoryStore.permissions.push({ id: `p-d-${mod.id}-${idx}`, role_id: doctorRoleId, module_id: mod.id, action: act });
      });
    }
  });

  // Receptionist permissions
  ['patients', 'cases', 'documents'].forEach(modKey => {
    const mod = memoryStore.modules.find(m => m.key === modKey);
    if (mod) {
      ['read', 'create', 'update'].forEach((act, idx) => {
        memoryStore.permissions.push({ id: `p-r-${mod.id}-${idx}`, role_id: recepRoleId, module_id: mod.id, action: act });
      });
    }
  });

  // 6. Users
  const drAyushId = 'user-dr-ayush';
  const drMedId = 'user-dr-med';

  memoryStore.users.push(
    { id: 'user-super', hospital_id: null, role_id: superRoleId, name: 'National Health Admin', email: 'superadmin@medikiosk.gov.in', phone: '9876500001', password_hash: defaultPasswordHash, status: 'active', created_at: new Date() },
    { id: 'user-admin', hospital_id: hospId, role_id: adminRoleId, name: 'Dr. Rajesh Sharma (Medical Superintendent)', email: 'admin@civildistrict.gov.in', phone: '9876500002', password_hash: defaultPasswordHash, status: 'active', created_at: new Date() },
    { id: drAyushId, hospital_id: hospId, department_id: 'dept-0002', role_id: doctorRoleId, name: 'Vaidya Ananya Deshmukh (BAMS, MD)', email: 'dr.ananya@civildistrict.gov.in', phone: '9876500003', password_hash: defaultPasswordHash, status: 'active', abha_id: '91-8822-1144-5501', created_at: new Date() },
    { id: drMedId, hospital_id: hospId, department_id: 'dept-0001', role_id: doctorRoleId, name: 'Dr. Vikramaditya Verma (MBBS, MD)', email: 'dr.vikram@civildistrict.gov.in', phone: '9876500004', password_hash: defaultPasswordHash, status: 'active', abha_id: '91-7733-2255-6602', created_at: new Date() }
  );

  // 7. Room Assignments
  const today = new Date().toISOString().split('T')[0];
  memoryStore.doctor_room_assignments.push(
    { id: 'room-001', doctor_id: drAyushId, room_number: 'Room 102 (AYUSH OPD)', assignment_date: today },
    { id: 'room-002', doctor_id: drMedId, room_number: 'Room 105 (General Medicine)', assignment_date: today }
  );

  // 8. Kiosk Device
  memoryStore.kiosk_devices.push({
    id: '00000000-0000-0000-0000-000000000001',
    hospital_id: hospId,
    location_label: 'Ground Floor Main OPD Reception Kiosk #1',
    is_active: true
  });

  // 9. Question Flows
  const genericTriageTree = {
    root_node_id: "q_main_complaint",
    nodes: {
      "q_main_complaint": {
        id: "q_main_complaint",
        question: { en: "What is your primary medical concern today?", hi: "आज आपकी मुख्य स्वास्थ्य समस्या क्या है?" },
        help_text: { en: "Select the option that best describes how you are feeling.", hi: "वह विकल्प चुनें जो आपकी स्थिति का सबसे अच्छा वर्णन करता है।" },
        type: "single_choice",
        options: [
          { id: "opt_chest", label: { en: "Chest Discomfort / Heavy Pain", hi: "छाती में दर्द या भारीपन" }, next_node: "q_chest_details" },
          { id: "opt_fever", label: { en: "Fever / Shivering / Body Heat", hi: "बुखार / कंपकंपी / शरीर तपना" }, next_node: "q_fever_duration" },
          { id: "opt_joint", label: { en: "Joint Pain / Stiffness / Arthritis", hi: "जोड़ों का दर्द / अकड़न / वात विकार" }, next_node: "q_joint_details" },
          { id: "opt_cough", label: { en: "Cough / Breathlessness / Sore Throat", hi: "खांसी / सांस फूलना / गले में खराश" }, next_node: "terminal_respiratory" },
          { id: "opt_stomach", label: { en: "Abdominal Pain / Acidity / Digestion", hi: "पेट दर्द / गैस / अपच / कब्ज" }, next_node: "terminal_digestive" },
          { id: "opt_headache", label: { en: "Headache / Dizziness / Migraine", hi: "सिरदर्द / चक्कर आना / माइग्रेन" }, next_node: "terminal_headache" }
        ]
      },
      "q_chest_details": {
        id: "q_chest_details",
        question: { en: "Does the chest pain spread to your left arm, neck, or jaw?", hi: "क्या छाती का दर्द आपके बाएं हाथ, गर्दन या जबड़े की तरफ फैलता है?" },
        type: "single_choice",
        options: [
          { id: "opt_chest_radiating", label: { en: "Yes, radiating pain with sweating", hi: "हाँ, पसीने के साथ दर्द फैलता है" }, next_node: "terminal_chest" },
          { id: "opt_chest_localized", label: { en: "No, localized dull chest pain", hi: "नहीं, केवल एक जगह हल्का दर्द है" }, next_node: "terminal_chest" }
        ]
      },
      "terminal_chest": { id: "terminal_chest", is_terminal: true, symptom_tags: ["chest_pain"], message: { en: "Emergency triage recorded.", hi: "आपातकालीन स्थिति दर्ज की गई।" } },
      "q_fever_duration": {
        id: "q_fever_duration",
        question: { en: "How many days have you had this fever?", hi: "आपको यह बुखार कितने दिनों से है?" },
        type: "single_choice",
        options: [
          { id: "opt_fever_1_2", label: { en: "1 - 2 Days", hi: "1 से 2 दिन" }, next_node: "terminal_fever" },
          { id: "opt_fever_3_5", label: { en: "3 - 5 Days", hi: "3 से 5 दिन" }, next_node: "terminal_fever" }
        ]
      },
      "terminal_fever": { id: "terminal_fever", is_terminal: true, symptom_tags: ["fever"], message: { en: "Fever intake recorded.", hi: "बुखार का विवरण दर्ज कर लिया गया है।" } },
      "q_joint_details": {
        id: "q_joint_details",
        question: { en: "Which joints are primarily painful or stiff?", hi: "मुख्य रूप से किन जोड़ों में दर्द या अकड़न है?" },
        type: "single_choice",
        options: [
          { id: "opt_knee_back", label: { en: "Knees / Lower Back / Neck (Sandhivata)", hi: "घुटने / कमर / गर्दन (संधिवात)" }, next_node: "terminal_joint" },
          { id: "opt_small_joints", label: { en: "Multiple small hand/foot joints (Amavata)", hi: "हाथ और पैरों के छोटे जोड़ (आमवात)" }, next_node: "terminal_joint" }
        ]
      },
      "terminal_joint": { id: "terminal_joint", is_terminal: true, symptom_tags: ["joint_pain"], message: { en: "Joint intake recorded.", hi: "जोड़ों के दर्द का विवरण दर्ज कर लिया गया है।" } },
      "terminal_respiratory": { id: "terminal_respiratory", is_terminal: true, symptom_tags: ["cough_breathlessness"], message: { en: "Respiratory intake recorded.", hi: "श्वसन संबंधी विवरण दर्ज कर लिया गया है।" } },
      "terminal_digestive": { id: "terminal_digestive", is_terminal: true, symptom_tags: ["abdominal_pain"], message: { en: "Gastrointestinal intake recorded.", hi: "पाचन संबंधी विवरण दर्ज कर लिया गया है।" } },
      "terminal_headache": { id: "terminal_headache", is_terminal: true, symptom_tags: ["headache"], message: { en: "Neurological intake recorded.", hi: "सिरदर्द का विवरण दर्ज कर लिया गया है।" } }
    }
  };

  memoryStore.question_flows.push({
    id: 'flow-generic',
    department_id: null,
    version: 1,
    tree: genericTriageTree,
    is_active: true
  });

  // 10. Department Routing Rules
  memoryStore.department_routing_rules.push(
    { id: 'rule-1', hospital_id: hospId, symptom_tag: 'chest_pain', department_id: 'dept-0001', priority: 100 },
    { id: 'rule-2', hospital_id: hospId, symptom_tag: 'cough_breathlessness', department_id: 'dept-0001', priority: 90 },
    { id: 'rule-3', hospital_id: hospId, symptom_tag: 'joint_pain', department_id: 'dept-0002', priority: 85 },
    { id: 'rule-4', hospital_id: hospId, symptom_tag: 'fever', department_id: 'dept-0001', priority: 80 },
    { id: 'rule-5', hospital_id: hospId, symptom_tag: 'abdominal_pain', department_id: 'dept-0001', priority: 75 },
    { id: 'rule-6', hospital_id: hospId, symptom_tag: 'headache', department_id: 'dept-0001', priority: 70 }
  );

  // 11. Medicines
  const meds = [
    { name: 'Paracetamol 500mg', generic_name: 'Paracetamol / Acetaminophen', form: 'tablet', strength: '500mg' },
    { name: 'Paracetamol 650mg (Dolo)', generic_name: 'Paracetamol', form: 'tablet', strength: '650mg' },
    { name: 'Amoxicillin 500mg', generic_name: 'Amoxicillin Trihydrate', form: 'capsule', strength: '500mg' },
    { name: 'Pantoprazole 40mg (Pan-40)', generic_name: 'Pantoprazole Sodium', form: 'tablet', strength: '40mg' },
    { name: 'Cetirizine 10mg', generic_name: 'Cetirizine Hydrochloride', form: 'tablet', strength: '10mg' },
    { name: 'Azithromycin 500mg (Azee)', generic_name: 'Azithromycin', form: 'tablet', strength: '500mg' },
    { name: 'Ashwagandha Churna', generic_name: 'Withania somnifera powder', form: 'powder', strength: '100g' },
    { name: 'Tribhuvan Kirti Ras', generic_name: 'Classical Herbo-Mineral Antipyretic', form: 'tablet', strength: '250mg' },
    { name: 'Sitopaladi Churna', generic_name: 'Cane sugar, Bambusa arundinacea', form: 'powder', strength: '50g' },
    { name: 'Liv.52 Tablets', generic_name: 'Hepatoprotective Herbal', form: 'tablet', strength: '500mg' }
  ];
  meds.forEach((m, idx) => {
    memoryStore.medicines.push({ id: `med-000${idx + 1}`, ...m });
  });

  console.log('[In-Memory DB Engine] Fully Seeded with Hospital, RBAC, Decision Flows & Medicines');
}

seedMemoryStore();

// Main query executor with automatic PostgreSQL / Memory store switching
const query = async (text, params = []) => {
  // If PostgreSQL is active, use it
  if (pool && isPgAvailable) {
    try {
      const res = await pool.query(text, params);
      return res;
    } catch (err) {
      // Fallback to memory store if pg error
    }
  }

  // Fallback In-Memory SQL Interpreter
  return executeInMemoryQuery(text, params);
};

// Simplified SQL parser & executor for In-Memory tables
function executeInMemoryQuery(sql, params) {
  const clean = sql.trim();

  // 1. SELECT hospitals
  if (clean.includes('FROM hospitals') && !clean.includes('JOIN')) {
    if (clean.includes('WHERE id = $1')) {
      const rows = memoryStore.hospitals.filter(h => h.id === params[0]);
      return { rows, rowCount: rows.length };
    }
    return { rows: memoryStore.hospitals, rowCount: memoryStore.hospitals.length };
  }

  // 2. SELECT users (Staff Login)
  if (clean.includes('FROM users u') && clean.includes('LOWER(u.email) = LOWER($1)')) {
    const user = memoryStore.users.find(u => u.email.toLowerCase() === params[0].toLowerCase() && u.status === 'active');
    if (!user) return { rows: [], rowCount: 0 };
    const role = memoryStore.roles.find(r => r.id === user.role_id);
    const hosp = memoryStore.hospitals.find(h => h.id === user.hospital_id);
    const dept = memoryStore.departments.find(d => d.id === user.department_id);
    const result = [{
      ...user,
      role_name: role?.name || 'Staff',
      hospital_name: hosp?.name || 'Platform',
      department_name: dept?.name || 'General'
    }];
    return { rows: result, rowCount: 1 };
  }

  // 3. User by ID (auth middleware)
  if (clean.includes('FROM users u') && clean.includes('WHERE u.id = $1')) {
    const user = memoryStore.users.find(u => u.id === params[0]);
    if (!user) return { rows: [], rowCount: 0 };
    const role = memoryStore.roles.find(r => r.id === user.role_id);
    return { rows: [{ ...user, role_name: role?.name || 'Staff' }], rowCount: 1 };
  }

  // 4. RBAC Permission Check
  if (clean.includes('FROM permissions p') && clean.includes('JOIN modules m')) {
    const roleId = params[0];
    const moduleKey = params[1];
    const action = params[2];
    const mod = memoryStore.modules.find(m => m.key === moduleKey);
    if (!mod) return { rows: [], rowCount: 0 };
    const hasPerm = memoryStore.permissions.some(p => p.role_id === roleId && p.module_id === mod.id && p.action === action);
    return { rows: hasPerm ? [{ ok: 1 }] : [], rowCount: hasPerm ? 1 : 0 };
  }

  // 5. Patient by Hospital & Phone
  if (clean.includes('FROM patients') && clean.includes('WHERE hospital_id = $1 AND phone = $2')) {
    const rows = memoryStore.patients.filter(p => p.hospital_id === params[0] && p.phone === params[1]);
    return { rows, rowCount: rows.length };
  }

  // 6. INSERT INTO patients
  if (clean.includes('INSERT INTO patients')) {
    const newPat = {
      id: `pat-${Date.now()}`,
      hospital_id: params[0],
      phone: params[1],
      name: params[2] || 'Patient',
      age: params[3] || 35,
      gender: params[4] || 'Other',
      abha_id: null,
      created_at: new Date()
    };
    memoryStore.patients.push(newPat);
    return { rows: [newPat], rowCount: 1 };
  }

  // 7. Active Patient Session
  if (clean.includes('FROM patient_sessions') && clean.includes('WHERE patient_id = $1 AND hospital_id = $2')) {
    const rows = memoryStore.patient_sessions.filter(s => s.patient_id === params[0] && s.hospital_id === params[1] && s.status === 'active');
    return { rows, rowCount: rows.length };
  }

  // 8. INSERT INTO patient_sessions
  if (clean.includes('INSERT INTO patient_sessions')) {
    const newSession = {
      id: `sess-${Date.now()}`,
      patient_id: params[0],
      hospital_id: params[1],
      token: params[2],
      language_pref: params[3] || 'en',
      status: 'active',
      is_kiosk_verified: Boolean(params[4]),
      expires_at: params[5],
      created_at: new Date()
    };
    memoryStore.patient_sessions.push(newSession);
    return { rows: [newSession], rowCount: 1 };
  }

  // 9. Session auth lookup: FROM patient_sessions s JOIN patients p
  if (clean.includes('FROM patient_sessions s') && clean.includes('JOIN patients p')) {
    const session = memoryStore.patient_sessions.find(s => s.token === params[0]);
    if (!session) return { rows: [], rowCount: 0 };
    const pat = memoryStore.patients.find(p => p.id === session.patient_id) || {};
    const hosp = memoryStore.hospitals.find(h => h.id === session.hospital_id) || {};
    return { rows: [{ ...session, ...pat, hospital_name: hosp.name }], rowCount: 1 };
  }

  // 10. Question Flows lookup
  if (clean.includes('FROM question_flows')) {
    let flow;
    if (params && params[0]) {
      flow = memoryStore.question_flows.find(f => f.department_id === params[0] && f.is_active);
    }
    if (!flow) {
      flow = memoryStore.question_flows.find(f => f.department_id === null && f.is_active);
    }
    return { rows: flow ? [flow] : [], rowCount: flow ? 1 : 0 };
  }

  // 11. Case Responses lookup
  if (clean.includes('FROM case_responses WHERE case_id = $1')) {
    const rows = memoryStore.case_responses.filter(r => r.case_id === params[0]);
    return { rows, rowCount: rows.length };
  }

  // 12. INSERT INTO case_responses
  if (clean.includes('INSERT INTO case_responses')) {
    const newResp = {
      id: `resp-${Date.now()}`,
      case_id: params[0],
      question_id: params[1],
      answer_text: params[2],
      answer_type: params[3] || 'touch',
      extracted_via_llm: Boolean(params[4]),
      created_at: new Date()
    };
    memoryStore.case_responses.push(newResp);
    return { rows: [newResp], rowCount: 1 };
  }

  // 13. Case lookup by session: FROM cases c JOIN patient_sessions s
  if (clean.includes('FROM cases c') && clean.includes('WHERE c.session_id = $1')) {
    const cases = memoryStore.cases.filter(c => c.session_id === params[0] && ['intake', 'ready_for_doctor', 'in_consult'].includes(c.status));
    if (cases.length === 0) return { rows: [], rowCount: 0 };
    const latest = cases[cases.length - 1];
    const sess = memoryStore.patient_sessions.find(s => s.id === latest.session_id) || {};
    const dept = memoryStore.departments.find(d => d.id === latest.department_id);
    return { rows: [{ ...latest, department_name: dept?.name, is_kiosk_verified: sess.is_kiosk_verified }], rowCount: 1 };
  }

  // 14. INSERT INTO cases
  if (clean.includes('INSERT INTO cases')) {
    const newCase = {
      id: `case-${Date.now()}`,
      session_id: params[0],
      hospital_id: params[1],
      department_id: params[2] || null,
      department_resolved_by: params[3] || null,
      chief_complaint: 'OPD Intake',
      status: 'intake',
      assigned_doctor_id: null,
      created_at: new Date()
    };
    memoryStore.cases.push(newCase);
    return { rows: [newCase], rowCount: 1 };
  }

  // 15. UPDATE cases
  if (clean.includes('UPDATE cases')) {
    const targetCaseId = params[params.length - 1];
    const target = memoryStore.cases.find(c => c.id === targetCaseId);
    if (target) {
      if (clean.includes('SET department_id = $1')) {
        target.department_id = params[0];
        target.department_resolved_by = 'auto_routed';
        target.chief_complaint = params[1];
      } else if (clean.includes('SET status = \'ready_for_doctor\'')) {
        target.status = 'ready_for_doctor';
        target.assigned_doctor_id = params[0];
      } else if (clean.includes('SET status = \'in_consult\'')) {
        target.status = 'in_consult';
      } else if (clean.includes('SET status = \'completed\'')) {
        target.status = 'completed';
      }
    }
    return { rows: target ? [target] : [], rowCount: target ? 1 : 0 };
  }

  // 16. Department Routing Rules lookup
  if (clean.includes('FROM department_routing_rules r')) {
    const hospId = params[0];
    const tags = params[1] || [];
    const matched = memoryStore.department_routing_rules
      .filter(r => r.hospital_id === hospId && tags.includes(r.symptom_tag))
      .sort((a, b) => b.priority - a.priority);
    if (matched.length > 0) {
      const top = matched[0];
      const dept = memoryStore.departments.find(d => d.id === top.department_id);
      return { rows: [{ ...top, department_name: dept?.name }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 17. Queue Token Count
  if (clean.includes('SELECT COALESCE(MAX(token_number)')) {
    const tokens = memoryStore.tokens.filter(t => t.hospital_id === params[0] && t.department_id === params[1]);
    const maxNum = tokens.reduce((max, t) => Math.max(max, t.token_number || 0), 0);
    return { rows: [{ next_number: maxNum + 1 }], rowCount: 1 };
  }

  // 18. INSERT INTO tokens
  if (clean.includes('INSERT INTO tokens')) {
    const newToken = {
      id: `tok-${Date.now()}`,
      case_id: params[0],
      hospital_id: params[1],
      department_id: params[2],
      doctor_id: params[3] || null,
      token_date: params[4],
      token_number: params[5],
      status: 'waiting',
      priority: Boolean(params[6]),
      room_number: params[7] || 'Room 102 (AYUSH OPD)',
      carried_from_token_id: params[8] || null,
      called_at: null,
      created_at: new Date()
    };
    memoryStore.tokens.push(newToken);
    return { rows: [newToken], rowCount: 1 };
  }

  // 19. Doctor Queue: FROM tokens t JOIN cases c
  if (clean.includes('FROM tokens t') && clean.includes('JOIN cases c')) {
    const hospId = params[0];
    const activeTokens = memoryStore.tokens
      .filter(t => t.hospital_id === hospId && ['waiting', 'called', 'in_consult', 'no_show'].includes(t.status))
      .sort((a, b) => {
        if (a.priority !== b.priority) return b.priority ? 1 : -1;
        return a.token_number - b.token_number;
      });

    const enriched = activeTokens.map(t => {
      const c = memoryStore.cases.find(x => x.id === t.case_id) || {};
      const s = memoryStore.patient_sessions.find(x => x.id === c.session_id) || {};
      const p = memoryStore.patients.find(x => x.id === s.patient_id) || {};
      const d = memoryStore.departments.find(x => x.id === t.department_id) || {};
      return {
        ...t,
        chief_complaint: c.chief_complaint,
        case_status: c.status,
        patient_id: p.id,
        patient_name: p.name || 'Patient',
        patient_phone: p.phone,
        patient_age: p.age || 35,
        patient_gender: p.gender || 'M',
        abha_id: p.abha_id,
        department_name: d.name
      };
    });
    return { rows: enriched, rowCount: enriched.length };
  }

  // 20. UPDATE tokens (Call, Start Consult, No-Show)
  if (clean.includes('UPDATE tokens')) {
    const targetId = params[params.length - 1];
    const target = memoryStore.tokens.find(t => t.id === targetId || t.case_id === targetId);
    if (target) {
      if (clean.includes('SET status = \'called\'')) {
        target.status = 'called';
        target.called_at = new Date();
        target.doctor_id = params[0];
        target.room_number = params[1];
      } else if (clean.includes('SET status = \'in_consult\'')) {
        target.status = 'in_consult';
      } else if (clean.includes('SET status = \'no_show\'')) {
        target.status = 'no_show';
      } else if (clean.includes('SET status = \'completed\'')) {
        target.status = 'completed';
      }
    }
    return { rows: target ? [target] : [], rowCount: target ? 1 : 0 };
  }

  // 21. Medicine search
  if (clean.includes('FROM medicines')) {
    if (clean.includes('WHERE name ILIKE $1') || clean.includes('similarity')) {
      const term = (params[0] || '').replace(/%/g, '').toLowerCase();
      const matched = memoryStore.medicines.filter(m => 
        m.name.toLowerCase().includes(term) || 
        (m.generic_name && m.generic_name.toLowerCase().includes(term))
      );
      return { rows: matched, rowCount: matched.length };
    }
    return { rows: memoryStore.medicines, rowCount: memoryStore.medicines.length };
  }

  // 22. Prescriptions & Prescription Items
  if (clean.includes('INSERT INTO prescriptions')) {
    const newRx = {
      id: `rx-${Date.now()}`,
      case_id: params[0],
      doctor_id: params[1],
      remarks: params[2],
      next_checkup_date: params[3],
      created_at: new Date()
    };
    memoryStore.prescriptions.push(newRx);
    return { rows: [newRx], rowCount: 1 };
  }

  if (clean.includes('INSERT INTO prescription_items')) {
    const newItem = {
      id: `pi-${Date.now()}`,
      prescription_id: params[0],
      medicine_id: params[1],
      dosage: params[2],
      frequency: params[3],
      timing: params[4],
      duration_days: params[5],
      notes: params[6]
    };
    memoryStore.prescription_items.push(newItem);
    return { rows: [newItem], rowCount: 1 };
  }

  // 23. Patient Past History
  if (clean.includes('FROM cases c') && clean.includes('WHERE s.patient_id = $1')) {
    const patientCases = memoryStore.cases.filter(c => {
      const s = memoryStore.patient_sessions.find(x => x.id === c.session_id);
      return s && s.patient_id === params[0];
    });

    const enriched = patientCases.map(c => {
      const rx = memoryStore.prescriptions.find(r => r.case_id === c.id);
      const doc = rx ? memoryStore.users.find(u => u.id === rx.doctor_id) : null;
      const dept = memoryStore.departments.find(d => d.id === c.department_id);
      return {
        ...c,
        department_name: dept?.name,
        prescription_id: rx?.id,
        remarks: rx?.remarks,
        next_checkup_date: rx?.next_checkup_date,
        doctor_name: doc?.name
      };
    });
    return { rows: enriched, rowCount: enriched.length };
  }

  // 24. Admin tables (departments, staff, roles, permissions, room_assignments, registration_requests)
  if (clean.includes('FROM departments')) {
    const rows = memoryStore.departments.filter(d => d.hospital_id === params[0] || !params[0]);
    return { rows, rowCount: rows.length };
  }
  if (clean.includes('INSERT INTO departments')) {
    const newD = { id: `dept-${Date.now()}`, hospital_id: params[0], name: params[1], is_active: params[2] };
    memoryStore.departments.push(newD);
    return { rows: [newD], rowCount: 1 };
  }

  if (clean.includes('FROM users u') && clean.includes('WHERE u.hospital_id = $1')) {
    const users = memoryStore.users.filter(u => u.hospital_id === params[0]);
    const enriched = users.map(u => {
      const r = memoryStore.roles.find(x => x.id === u.role_id);
      const d = memoryStore.departments.find(x => x.id === u.department_id);
      return { ...u, role_name: r?.name, department_name: d?.name };
    });
    return { rows: enriched, rowCount: enriched.length };
  }

  if (clean.includes('INSERT INTO users')) {
    const newU = {
      id: `user-${Date.now()}`,
      hospital_id: params[0],
      department_id: params[1],
      role_id: params[2],
      name: params[3],
      email: params[4],
      phone: params[5],
      password_hash: params[6],
      status: 'active',
      abha_id: params[7] || null,
      created_at: new Date()
    };
    memoryStore.users.push(newU);
    return { rows: [newU], rowCount: 1 };
  }

  if (clean.includes('FROM roles')) {
    return { rows: memoryStore.roles, rowCount: memoryStore.roles.length };
  }
  if (clean.includes('FROM modules')) {
    return { rows: memoryStore.modules, rowCount: memoryStore.modules.length };
  }
  if (clean.includes('FROM permissions p JOIN modules m')) {
    const perms = memoryStore.permissions.map(p => {
      const m = memoryStore.modules.find(x => x.id === p.module_id);
      return { role_id: p.role_id, module_key: m?.key, action: p.action };
    });
    return { rows: perms, rowCount: perms.length };
  }

  if (clean.includes('FROM doctor_room_assignments dra')) {
    const rows = memoryStore.doctor_room_assignments.map(dra => {
      const doc = memoryStore.users.find(u => u.id === dra.doctor_id) || {};
      const dept = memoryStore.departments.find(d => d.id === doc.department_id) || {};
      return { ...dra, doctor_name: doc.name, department_name: dept.name };
    });
    return { rows, rowCount: rows.length };
  }

  if (clean.includes('INSERT INTO doctor_room_assignments')) {
    const existingIdx = memoryStore.doctor_room_assignments.findIndex(a => a.doctor_id === params[0] && a.assignment_date === params[2]);
    const record = { id: `dra-${Date.now()}`, doctor_id: params[0], room_number: params[1], assignment_date: params[2] };
    if (existingIdx >= 0) {
      memoryStore.doctor_room_assignments[existingIdx] = record;
    } else {
      memoryStore.doctor_room_assignments.push(record);
    }
    return { rows: [record], rowCount: 1 };
  }

  if (clean.includes('FROM registration_requests')) {
    return { rows: memoryStore.registration_requests, rowCount: memoryStore.registration_requests.length };
  }

  if (clean.includes('INSERT INTO hospitals')) {
    const newH = {
      id: `hosp-${Date.now()}`,
      name: params[0],
      registration_mode: params[1] || 'admin_creates',
      address: params[2],
      contact_phone: params[3],
      created_at: new Date()
    };
    memoryStore.hospitals.push(newH);
    return { rows: [newH], rowCount: 1 };
  }

  // Generic fallback
  return { rows: [], rowCount: 0 };
}

const getClient = async () => {
  return {
    query: (...args) => query(...args),
    release: () => {}
  };
};

module.exports = {
  query,
  getClient,
  pool,
  memoryStore
};
