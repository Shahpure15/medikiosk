# MediKiosk — AYUSH / General OPD Case-Taking Platform
**Smart India Hackathon 2026 (PS 047)**

A multi-tenant, bilingual/multilingual OPD case-taking platform tailored for Indian public health ecosystems, hospital kiosks, and mobile workflows.

## Key Features & Architecture
- **Sole Datastore**: PostgreSQL with `pg_trgm` extension for typo-tolerant medicine search.
- **Dynamic RBAC**: Zero hardcoded roles. Every action verified dynamically against `permissions` mapping (`Role x Module x Action`).
- **Two-Tier Patient Identity**: Stable `patients` record + per-visit temporary `patient_sessions`. Authentication via phone OTP only.
- **Rule-Engine Intake & Deterministic Routing**: Traverses `question_flows.tree` node-by-node. Triage tags auto-routed via `department_routing_rules` SQL lookup.
- **Asymmetric Trust Kiosk Presence Gate**: Prevents remote queue abuse; remote sessions require scanning a single-use kiosk verification QR before token issuance.
- **Clinical Doctor Dashboard & Native WebSockets**: Real-time `case_ready` queue push, two-step consultation lifecycle (`called` vs `in_consult` for accurate no-show management), Indian prescription shorthand (1-0-1, SOS), and OCR inspection.
- **4 Dedicated Frontend Bundles/Views**:
  1. `patient-kiosk`: Government-portal theme, large touch targets, touch/voice Q&A, QR presence generator.
  2. `patient-phone`: Mobile PWA, phone OTP, QR scanner, waiting screen with real-time `your_turn` turn notifications, and past prescription history.
  3. `doctor-dashboard`: High-density clinical EHR/EMR register, queue management, consult card, and prescription builder.
  4. `admin`: Hospital Admin (departments, staff, dynamic RBAC view, daily room assignments, registration approval) and Super Admin (`/superadmin` multi-tenant hospital onboarding).

## Directory Layout
```
├── backend/          # Node.js + Express + Native WebSockets + PostgreSQL
│   ├── src/
│   │   ├── config/   # Env, DB & AI configuration
│   │   ├── db/       # Schema, Migrations, Seeds
│   │   ├── middleware/ # JWT Auth, Dynamic RBAC, Hospital Scoping
│   │   ├── services/ # Business Logic & State Machines
│   │   ├── controllers/
│   │   └── routes/
└── frontend/         # Vite + React PWA (4 dedicated bundle views)
    ├── src/
    │   ├── components/ # Kiosk, Phone, Doctor, Admin modular components
    │   ├── views/      # 4 dedicated views (Kiosk, Phone, Doctor, Admin)
    │   ├── context/    # Auth & WebSocket Providers
    │   └── styles/     # Government Theme, Kiosk, Clinical & Admin CSS
```
