const bcrypt = require('bcryptjs');
const { pool, query } = require('./index');

async function seed() {
  console.log('[Seed] Starting database seeding...');
  try {
    // 1. Seed Modules
    const moduleKeys = ['patients', 'cases', 'staff', 'roles', 'hospitals', 'reports', 'documents'];
    const moduleMap = {};
    for (const key of moduleKeys) {
      const res = await query(
        `INSERT INTO modules (key) VALUES ($1) 
         ON CONFLICT (key) DO UPDATE SET key = EXCLUDED.key 
         RETURNING id, key`,
        [key]
      );
      moduleMap[key] = res.rows[0].id;
    }
    console.log('[Seed] Modules seeded:', Object.keys(moduleMap).length);

    // 2. Seed Hospital
    const hospRes = await query(
      `INSERT INTO hospitals (name, registration_mode, physical_presence_required, address, contact_phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        'District Civil & AYUSH Hospital, Central District', 
        'admin_creates', 
        true, 
        'Civil Lines, Rajpath Marg, New Delhi - 110001', 
        '+91 11 2345 6789'
      ]
    );
    const hospitalId = hospRes.rows[0].id;
    console.log('[Seed] Seeded Hospital ID:', hospitalId);

    // 3. Seed Departments
    const depts = [
      { name: 'General Medicine', active: true },
      { name: 'AYUSH (Ayurveda & Panchakarma)', active: true },
      { name: 'Orthopedics & Joint Care', active: true },
      { name: 'Pediatrics (Child OPD)', active: true },
      { name: 'ENT (Ear, Nose & Throat)', active: true },
      { name: 'Dermatology & Skin Care', active: true }
    ];
    const deptMap = {};
    for (const d of depts) {
      const res = await query(
        `INSERT INTO departments (hospital_id, name, is_active) VALUES ($1, $2, $3) RETURNING id, name`,
        [hospitalId, d.name, d.active]
      );
      deptMap[d.name] = res.rows[0].id;
    }
    console.log('[Seed] Departments seeded:', Object.keys(deptMap).length);

    // 4. Seed Roles & Permissions
    const superRoleRes = await query(
      `INSERT INTO roles (hospital_id, name, is_system_role) VALUES (NULL, $1, true) RETURNING id`,
      ['Super Administrator']
    );
    const superRoleId = superRoleRes.rows[0].id;

    const adminRoleRes = await query(
      `INSERT INTO roles (hospital_id, name, is_system_role) VALUES ($1, $2, true) RETURNING id`,
      [hospitalId, 'Hospital Administrator']
    );
    const adminRoleId = adminRoleRes.rows[0].id;

    const doctorRoleRes = await query(
      `INSERT INTO roles (hospital_id, name, is_system_role) VALUES ($1, $2, true) RETURNING id`,
      [hospitalId, 'Medical Officer / Doctor']
    );
    const doctorRoleId = doctorRoleRes.rows[0].id;

    const recepRoleRes = await query(
      `INSERT INTO roles (hospital_id, name, is_system_role) VALUES ($1, $2, true) RETURNING id`,
      [hospitalId, 'OPD Receptionist']
    );
    const recepRoleId = recepRoleRes.rows[0].id;

    // Dynamic Permissions Matrix
    const actions = ['create', 'read', 'update', 'delete', 'approve'];
    
    // Super Admin: all permissions
    for (const modKey of moduleKeys) {
      for (const act of actions) {
        await query(
          `INSERT INTO permissions (role_id, module_id, action) 
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [superRoleId, moduleMap[modKey], act]
        );
      }
    }

    // Hospital Admin: full access on hospital modules
    for (const modKey of ['staff', 'roles', 'patients', 'cases', 'reports', 'documents']) {
      for (const act of actions) {
        await query(
          `INSERT INTO permissions (role_id, module_id, action) 
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [adminRoleId, moduleMap[modKey], act]
        );
      }
    }

    // Doctor permissions
    const doctorPerms = [
      { mod: 'patients', actions: ['read'] },
      { mod: 'cases', actions: ['read', 'update'] },
      { mod: 'documents', actions: ['read', 'create'] },
      { mod: 'reports', actions: ['read', 'create'] }
    ];
    for (const p of doctorPerms) {
      for (const act of p.actions) {
        await query(
          `INSERT INTO permissions (role_id, module_id, action) 
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [doctorRoleId, moduleMap[p.mod], act]
        );
      }
    }

    // Receptionist permissions
    const recepPerms = [
      { mod: 'patients', actions: ['create', 'read', 'update'] },
      { mod: 'cases', actions: ['create', 'read'] },
      { mod: 'documents', actions: ['create', 'read'] }
    ];
    for (const p of recepPerms) {
      for (const act of p.actions) {
        await query(
          `INSERT INTO permissions (role_id, module_id, action) 
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [recepRoleId, moduleMap[p.mod], act]
        );
      }
    }
    console.log('[Seed] Dynamic RBAC Roles and Permissions matrix initialized');

    // 5. Seed Users
    const defaultPasswordHash = await bcrypt.hash('Password@123', 10);

    // Super Admin
    await query(
      `INSERT INTO users (hospital_id, role_id, name, email, phone, password_hash, status)
       VALUES (NULL, $1, $2, $3, $4, $5, 'active')`,
      [superRoleId, 'National Health Authority Admin', 'superadmin@medikiosk.gov.in', '9876500001', defaultPasswordHash]
    );

    // Hospital Admin
    await query(
      `INSERT INTO users (hospital_id, role_id, name, email, phone, password_hash, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
      [hospitalId, adminRoleId, 'Dr. Rajesh Sharma (Medical Superintendent)', 'admin@civildistrict.gov.in', '9876500002', defaultPasswordHash]
    );

    // AYUSH Doctor
    const drAyushRes = await query(
      `INSERT INTO users (hospital_id, department_id, role_id, name, email, phone, password_hash, status, abha_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', '91-8822-1144-5501')
       RETURNING id`,
      [hospitalId, deptMap['AYUSH (Ayurveda & Panchakarma)'], doctorRoleId, 'Vaidya Ananya Deshmukh (BAMS, MD)', 'dr.ananya@civildistrict.gov.in', '9876500003', defaultPasswordHash]
    );
    const drAyushId = drAyushRes.rows[0].id;

    // General Medicine Doctor
    const drMedRes = await query(
      `INSERT INTO users (hospital_id, department_id, role_id, name, email, phone, password_hash, status, abha_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', '91-7733-2255-6602')
       RETURNING id`,
      [hospitalId, deptMap['General Medicine'], doctorRoleId, 'Dr. Vikramaditya Verma (MBBS, MD)', 'dr.vikram@civildistrict.gov.in', '9876500004', defaultPasswordHash]
    );
    const drMedId = drMedRes.rows[0].id;

    // Receptionist
    await query(
      `INSERT INTO users (hospital_id, role_id, name, email, phone, password_hash, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
      [hospitalId, recepRoleId, 'Priya Nair (Desk Lead)', 'reception@civildistrict.gov.in', '9876500005', defaultPasswordHash]
    );
    console.log('[Seed] Staff and Doctors seeded with default password: Password@123');

    // 6. Seed Daily Doctor Room Assignments
    const today = new Date().toISOString().split('T')[0];
    await query(
      `INSERT INTO doctor_room_assignments (doctor_id, room_number, assignment_date)
       VALUES ($1, $2, $3) ON CONFLICT (doctor_id, assignment_date) DO UPDATE SET room_number = EXCLUDED.room_number`,
      [drAyushId, 'Room 102 (AYUSH OPD)', today]
    );
    await query(
      `INSERT INTO doctor_room_assignments (doctor_id, room_number, assignment_date)
       VALUES ($1, $2, $3) ON CONFLICT (doctor_id, assignment_date) DO UPDATE SET room_number = EXCLUDED.room_number`,
      [drMedId, 'Room 105 (General Medicine)', today]
    );
    console.log('[Seed] Daily room assignments initialized');

    // 7. Seed Kiosk Device
    await query(
      `INSERT INTO kiosk_devices (hospital_id, location_label, is_active)
       VALUES ($1, $2, true)`,
      [hospitalId, 'Ground Floor Main OPD Reception Kiosk #1']
    );

    // 8. Seed Rich SOCRATES Question Trees
    const genericTriageTree = {
      root_node_id: "q_main_complaint",
      nodes: {
        "q_main_complaint": {
          id: "q_main_complaint",
          question: {
            en: "What is your primary medical concern today?",
            hi: "आज आपकी मुख्य स्वास्थ्य समस्या क्या है?"
          },
          help_text: {
            en: "Select the option that best describes what you are feeling.",
            hi: "वह विकल्प चुनें जो आपकी स्थिति का सबसे अच्छा वर्णन करता है।"
          },
          type: "single_choice",
          options: [
            { id: "opt_chest", label: { en: "Chest Discomfort / Heavy Pain", hi: "छाती में दर्द या भारीपन" }, next_node: "q_chest_details" },
            { id: "opt_fever", label: { en: "Fever / Shivering / Body Heat", hi: "बुखार / कंपकंपी / शरीर तपना" }, next_node: "q_fever_duration" },
            { id: "opt_joint", label: { en: "Joint Pain / Stiffness / Arthritis", hi: "जोड़ों का दर्द / अकड़न / वात विकार" }, next_node: "q_joint_details" },
            { id: "opt_cough", label: { en: "Cough / Breathlessness / Sore Throat", hi: "खांसी / सांस फूलना / गले में खराश" }, next_node: "q_cough_duration" },
            { id: "opt_stomach", label: { en: "Abdominal Pain / Acidity / Digestion", hi: "पेट दर्द / गैस / अपच / कब्ज" }, next_node: "q_stomach_details" },
            { id: "opt_headache", label: { en: "Headache / Dizziness / Migraine", hi: "सिरदर्द / चक्कर आना / माइग्रेन" }, next_node: "q_headache_details" }
          ]
        },
        "q_chest_details": {
          id: "q_chest_details",
          question: {
            en: "Does the chest pain spread to your left arm, neck, or jaw?",
            hi: "क्या छाती का दर्द आपके बाएं हाथ, गर्दन या जबड़े की तरफ फैलता है?"
          },
          type: "single_choice",
          options: [
            { id: "opt_chest_radiating", label: { en: "Yes, radiating pain with sweating", hi: "हाँ, पसीने के साथ दर्द फैलता है" }, next_node: "terminal_chest_emergency" },
            { id: "opt_chest_localized", label: { en: "No, localized dull chest pain", hi: "नहीं, केवल एक जगह हल्का दर्द है" }, next_node: "terminal_chest_regular" }
          ]
        },
        "terminal_chest_emergency": {
          id: "terminal_chest_emergency",
          is_terminal: true,
          symptom_tags: ["chest_pain", "red_flag_emergency"],
          message: {
            en: "Urgent triage recorded. Priority routing to General Medicine.",
            hi: "आपातकालीन स्थिति दर्ज की गई। जनरल मेडिसिन को प्राथमिकता दी जा रही है।"
          }
        },
        "terminal_chest_regular": {
          id: "terminal_chest_regular",
          is_terminal: true,
          symptom_tags: ["chest_pain"],
          message: {
            en: "Chest symptom intake recorded.",
            hi: "छाती की जांच के लिए ट्रायज पूरा हुआ।"
          }
        },
        "q_fever_duration": {
          id: "q_fever_duration",
          question: {
            en: "How many days have you had this fever?",
            hi: "आपको यह बुखार कितने दिनों से है?"
          },
          type: "single_choice",
          options: [
            { id: "opt_fever_1_2", label: { en: "1 - 2 Days", hi: "1 से 2 दिन" }, next_node: "q_fever_associated" },
            { id: "opt_fever_3_5", label: { en: "3 - 5 Days", hi: "3 से 5 दिन" }, next_node: "q_fever_associated" },
            { id: "opt_fever_week", label: { en: "More than a week", hi: "1 सप्ताह से अधिक" }, next_node: "q_fever_associated" }
          ]
        },
        "q_fever_associated": {
          id: "q_fever_associated",
          question: {
            en: "Do you also experience severe body aches, chills, or skin rash?",
            hi: "क्या आपको तेज बदन दर्द, ठंड लगना या त्वचा पर दाने भी हैं?"
          },
          type: "single_choice",
          options: [
            { id: "opt_fever_chills", label: { en: "Yes, high chills and body ache", hi: "हाँ, तेज ठंड और बदन दर्द है" }, next_node: "terminal_fever" },
            { id: "opt_fever_mild", label: { en: "Mild fever without severe chills", hi: "हल्का बुखार है" }, next_node: "terminal_fever" }
          ]
        },
        "terminal_fever": {
          id: "terminal_fever",
          is_terminal: true,
          symptom_tags: ["fever"],
          message: {
            en: "Fever symptom intake recorded.",
            hi: "बुखार का विवरण दर्ज कर लिया गया है।"
          }
        },
        "q_joint_details": {
          id: "q_joint_details",
          question: {
            en: "Which joints are primarily painful or stiff?",
            hi: "मुख्य रूप से किन जोड़ों में दर्द या अकड़न है?"
          },
          type: "single_choice",
          options: [
            { id: "opt_knee_back", label: { en: "Knees / Lower Back / Neck (Sandhivata)", hi: "घुटने / कमर / गर्दन (संधिवात)" }, next_node: "q_joint_duration" },
            { id: "opt_small_joints", label: { en: "Multiple small hand/foot joints (Amavata)", hi: "हाथ और पैरों के छोटे जोड़ (आमवात)" }, next_node: "q_joint_duration" }
          ]
        },
        "q_joint_duration": {
          id: "q_joint_duration",
          question: {
            en: "Is the stiffness worse in the early morning?",
            hi: "क्या सुबह उठने पर अकड़न और दर्द अधिक महसूस होता है?"
          },
          type: "single_choice",
          options: [
            { id: "opt_morning_stiff_yes", label: { en: "Yes, severe morning stiffness", hi: "हाँ, सुबह अधिक अकड़न होती है" }, next_node: "terminal_joint" },
            { id: "opt_morning_stiff_no", label: { en: "Constant or after physical exertion", hi: "दिनभर या काम करने के बाद दर्द" }, next_node: "terminal_joint" }
          ]
        },
        "terminal_joint": {
          id: "terminal_joint",
          is_terminal: true,
          symptom_tags: ["joint_pain"],
          message: {
            en: "Joint and musculoskeletal intake recorded. Routing to AYUSH / Ortho.",
            hi: "जोड़ों के दर्द का विवरण दर्ज कर लिया गया है।"
          }
        },
        "q_cough_duration": {
          id: "q_cough_duration",
          question: {
            en: "What type of cough are you experiencing?",
            hi: "आपको किस प्रकार की खांसी हो रही है?"
          },
          type: "single_choice",
          options: [
            { id: "opt_dry_cough", label: { en: "Dry cough with throat irritation", hi: "सूखी खांसी और गले में चुभन" }, next_node: "terminal_respiratory" },
            { id: "opt_wet_cough", label: { en: "Productive wet cough / Phlegm", hi: "बलगम वाली खांसी" }, next_node: "terminal_respiratory" },
            { id: "opt_breathing_diff", label: { en: "Difficulty in breathing / Wheezing", hi: "सांस लेने में कठिनाई / घबराहट" }, next_node: "terminal_respiratory" }
          ]
        },
        "terminal_respiratory": {
          id: "terminal_respiratory",
          is_terminal: true,
          symptom_tags: ["cough_breathlessness"],
          message: {
            en: "Respiratory intake recorded.",
            hi: "श्वसन संबंधी विवरण दर्ज कर लिया गया है।"
          }
        },
        "q_stomach_details": {
          id: "q_stomach_details",
          question: {
            en: "What is your main digestive concern?",
            hi: "आपकी पाचन से संबंधित मुख्य समस्या क्या है?"
          },
          type: "single_choice",
          options: [
            { id: "opt_acidity", label: { en: "Severe acidity / Heartburn / Amlapitta", hi: "अम्लपित्त / खट्टी डकार / सीने में जलन" }, next_node: "terminal_digestive" },
            { id: "opt_stomach_pain", label: { en: "Abdominal cramping / Gas bloating", hi: "पेट में मरोड़ / गैस का गोला / दर्द" }, next_node: "terminal_digestive" },
            { id: "opt_bowel_issue", label: { en: "Constipation / Irregular Bowel movements", hi: "कब्ज / पेट साफ न होना" }, next_node: "terminal_digestive" }
          ]
        },
        "terminal_digestive": {
          id: "terminal_digestive",
          is_terminal: true,
          symptom_tags: ["abdominal_pain"],
          message: {
            en: "Gastrointestinal intake recorded.",
            hi: "पाचन संबंधी विवरण दर्ज कर लिया गया है।"
          }
        },
        "q_headache_details": {
          id: "q_headache_details",
          question: {
            en: "How long has this headache been bothering you?",
            hi: "यह सिरदर्द आपको कब से परेशान कर रहा है?"
          },
          type: "single_choice",
          options: [
            { id: "opt_sudden_severe", label: { en: "Sudden intense headache", hi: "अचानक बहुत तेज सिरदर्द" }, next_node: "terminal_headache" },
            { id: "opt_chronic_migraine", label: { en: "Throbbing one-sided pain (Migraine)", hi: "आधे सिर में धड़कने वाला दर्द (माइग्रेन)" }, next_node: "terminal_headache" }
          ]
        },
        "terminal_headache": {
          id: "terminal_headache",
          is_terminal: true,
          symptom_tags: ["headache"],
          message: {
            en: "Headache intake recorded.",
            hi: "सिरदर्द का विवरण दर्ज कर लिया गया है।"
          }
        }
      }
    };

    // AYUSH Rog-Parikshan Flow
    const ayushTree = {
      root_node_id: "ayush_q1_prakriti",
      nodes: {
        "ayush_q1_prakriti": {
          id: "ayush_q1_prakriti",
          question: {
            en: "What type of Ayurvedic imbalance do you primarily feel?",
            hi: "आप मुख्य रूप से किस प्रकार का असंतुलन महसूस करते हैं?"
          },
          type: "single_choice",
          options: [
            { id: "opt_vata", label: { en: "Vata: Joint dryness, body stiffness, gas, sleep issues", hi: "वात: जोड़ों में दर्द/सूखापन, अनिद्रा, बेचैनी" }, next_node: "ayush_q2_agni" },
            { id: "opt_pitta", label: { en: "Pitta: Burning sensation, excess heat, acid reflux", hi: "पित्त: जलन, अत्यधिक गर्मी, खट्टी डकार, दाने" }, next_node: "ayush_q2_agni" },
            { id: "opt_kapha", label: { en: "Kapha: Heavy body, mucus congestion, lethargy", hi: "कफ: शरीर में भारीपन, कफ/बलगम, सुस्ती" }, next_node: "ayush_q2_agni" }
          ]
        },
        "ayush_q2_agni": {
          id: "ayush_q2_agni",
          question: {
            en: "How is your digestive fire (Jatharagni) and appetite?",
            hi: "आपकी भूख और पाचन शक्ति (जठराग्नि) कैसी है?"
          },
          type: "single_choice",
          options: [
            { id: "opt_manda_agni", label: { en: "Weak appetite / Slow digestion (Manda Agni)", hi: "मंद अग्नि (भूख कम लगना / भारीपन)" }, next_node: "ayush_q3_sleep" },
            { id: "opt_tikshna_agni", label: { en: "Excessive burning appetite (Tikshna Agni)", hi: "तीक्ष्ण अग्नि (बार-बार भूख व जलन)" }, next_node: "ayush_q3_sleep" },
            { id: "opt_vishama_agni", label: { en: "Irregular appetite / Bloating (Vishama Agni)", hi: "विषम अग्नि (कभी भूख कभी नहीं, गैस)" }, next_node: "ayush_q3_sleep" }
          ]
        },
        "ayush_q3_sleep": {
          id: "ayush_q3_sleep",
          question: {
            en: "How is your sleep pattern (Nidra)?",
            hi: "आपकी नींद (निद्रा) कैसी रहती है?"
          },
          type: "single_choice",
          options: [
            { id: "opt_disturbed_sleep", label: { en: "Disturbed / Broken sleep", hi: "अधूरी या टूटी-फूटी नींद" }, next_node: "terminal_ayush_complete" },
            { id: "opt_sound_sleep", label: { en: "Sound and regular sleep", hi: "गहरी और सामान्य नींद" }, next_node: "terminal_ayush_complete" }
          ]
        },
        "terminal_ayush_complete": {
          id: "terminal_ayush_complete",
          is_terminal: true,
          symptom_tags: ["ayush_consultation"],
          message: {
            en: "Ayurvedic Rog-Parikshan intake successfully recorded.",
            hi: "आयुर्वेदिक रोग परीक्षण विवरण सफलतापूर्वक दर्ज हुआ।"
          }
        }
      }
    };

    await query(
      `INSERT INTO question_flows (department_id, version, tree, is_active)
       VALUES (NULL, 1, $1, true)`,
      [JSON.stringify(genericTriageTree)]
    );
    await query(
      `INSERT INTO question_flows (department_id, version, tree, is_active)
       VALUES ($1, 1, $2, true)`,
      [deptMap['AYUSH (Ayurveda & Panchakarma)'], JSON.stringify(ayushTree)]
    );
    console.log('[Seed] Question Flows (Generic Triage + AYUSH) seeded');

    // 9. Seed Department Routing Rules
    const routingRules = [
      { tag: 'chest_pain', dept: deptMap['General Medicine'], priority: 100 },
      { tag: 'cough_breathlessness', dept: deptMap['General Medicine'], priority: 90 },
      { tag: 'joint_pain', dept: deptMap['AYUSH (Ayurveda & Panchakarma)'], priority: 85 },
      { tag: 'fever', dept: deptMap['General Medicine'], priority: 80 },
      { tag: 'abdominal_pain', dept: deptMap['General Medicine'], priority: 75 },
      { tag: 'headache', dept: deptMap['General Medicine'], priority: 70 },
      { tag: 'ayush_consultation', dept: deptMap['AYUSH (Ayurveda & Panchakarma)'], priority: 95 }
    ];
    for (const r of routingRules) {
      await query(
        `INSERT INTO department_routing_rules (hospital_id, symptom_tag, department_id, priority)
         VALUES ($1, $2, $3, $4)`,
        [hospitalId, r.tag, r.dept, r.priority]
      );
    }
    console.log('[Seed] Deterministic department routing rules seeded');

    // 10. Seed Medicines Catalog
    const medList = [
      { name: 'Paracetamol 500mg', generic_name: 'Paracetamol / Acetaminophen', form: 'tablet', strength: '500mg' },
      { name: 'Paracetamol 650mg (Dolo)', generic_name: 'Paracetamol', form: 'tablet', strength: '650mg' },
      { name: 'Amoxicillin 500mg', generic_name: 'Amoxicillin Trihydrate', form: 'capsule', strength: '500mg' },
      { name: 'Pantoprazole 40mg (Pan-40)', generic_name: 'Pantoprazole Sodium', form: 'tablet', strength: '40mg' },
      { name: 'Cetirizine 10mg', generic_name: 'Cetirizine Hydrochloride', form: 'tablet', strength: '10mg' },
      { name: 'Azithromycin 500mg (Azee)', generic_name: 'Azithromycin', form: 'tablet', strength: '500mg' },
      { name: 'ORS Electrolyte Powder', generic_name: 'Oral Rehydration Salts IP', form: 'powder', strength: '21.8g sachet' },
      { name: 'Ibuprofen 400mg', generic_name: 'Ibuprofen', form: 'tablet', strength: '400mg' },
      { name: 'Metformin 500mg', generic_name: 'Metformin Hydrochloride', form: 'tablet', strength: '500mg' },
      { name: 'Amlodipine 5mg', generic_name: 'Amlodipine Besylate', form: 'tablet', strength: '5mg' },
      { name: 'Cough Syrup (Ascoril D)', generic_name: 'Dextromethorphan + Phenylephrine', form: 'syrup', strength: '100ml' },
      { name: 'Ashwagandha Churna', generic_name: 'Withania somnifera powder', form: 'powder', strength: '100g' },
      { name: 'Tribhuvan Kirti Ras', generic_name: 'Classical Herbo-Mineral Antipyretic', form: 'tablet', strength: '250mg' },
      { name: 'Sitopaladi Churna', generic_name: 'Cane sugar, Bambusa arundinacea, Piper longum', form: 'powder', strength: '50g' },
      { name: 'Triphala Guggulu', generic_name: 'Haritaki, Bibhitaki, Amalaki, Guggulu', form: 'tablet', strength: '500mg' },
      { name: 'Maharasnadi Kwath', generic_name: 'Decoction for Vata & Joint Disorders', form: 'syrup', strength: '200ml' },
      { name: 'Septilin Syrup', generic_name: 'Ayurvedic Immunity Booster', form: 'syrup', strength: '100ml' },
      { name: 'Liv.52 Tablets', generic_name: 'Himsra, Kasani Hepatoprotective', form: 'tablet', strength: '500mg' },
      { name: 'Yograj Guggulu', generic_name: 'Classical Anti-inflammatory Tablet', form: 'tablet', strength: '375mg' }
    ];

    for (const m of medList) {
      await query(
        `INSERT INTO medicines (name, generic_name, form, strength)
         VALUES ($1, $2, $3, $4)`,
        [m.name, m.generic_name, m.form, m.strength]
      );
    }
    console.log('[Seed] Seeded 20+ Medicines with GIN pg_trgm indexing');

    console.log('\n======================================================');
    console.log(' SEEDING COMPLETE SUCCESSFULLY!');
    console.log(' Hospital ID: ' + hospitalId);
    console.log(' Hospital Admin: admin@civildistrict.gov.in / Password@123');
    console.log(' AYUSH Doctor: dr.ananya@civildistrict.gov.in / Password@123');
    console.log(' GenMed Doctor: dr.vikram@civildistrict.gov.in / Password@123');
    console.log(' SuperAdmin: superadmin@medikiosk.gov.in / Password@123');
    console.log('======================================================\n');

  } catch (err) {
    console.error('[Seed Error]', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
