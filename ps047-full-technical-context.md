# PS 047 — Full Technical Context Document (for PRD drafting)

This document consolidates every decision made so far for PS 047. It is meant to be fed as-is into a PRD-drafting pass — nothing here should need re-deriving.

---

## 1. Problem Statement Context

**PS 047** is an AYUSH/General OPD **patient case-taking software** — a digital system that conducts structured patient history-taking (via voice + touch) before a doctor consultation, extracts and organizes clinical information from uploaded documents, and presents a doctor-ready summary — replacing/augmenting manual history-taking and paper-based OPD records.

Core capabilities required by the PS:
- Voice + touch dual-mode patient interview
- Multilingual support with Hindi-English code-switch handling
- ABHA/Aadhaar-based patient identity and registration
- Adaptive, complaint-specific branching questionnaires (SOCRATES-style + AYUSH Dashavidha Pariksha)
- Document upload + OCR for prescriptions/lab reports/discharge summaries
- Clinical entity extraction (medicines, allergies, complaints) from both conversation and documents
- Red-flag/triage detection with alerting
- Structured, editable physician summary
- Doctor dashboard for reviewing/confirming AI-extracted data
- Longitudinal patient timeline across visits
- ABDM/FHIR interoperability (sandbox/mocked acceptable for prototype)

**Hard constraint from the PS itself:** autonomous AI diagnosis is explicitly out of scope and "legally/ethically unacceptable." The system is decision-support only — AI extracts, structures, and flags; the doctor decides.

## 2. Product Differentiators (why this isn't generic OPD software)

- **AYUSH-specific structured intake**: a reusable Dashavidha Pariksha (constitution) profile stored against the ABHA-linked patient record, captured once and reused across visits (constitution doesn't change visit-to-visit, unlike symptoms). Ahara-Vihara (diet/lifestyle) history captured as structured queryable fields, not free text.
- **Department-specific question trees**: different adaptive intake flows for Ayurveda OPD vs. General Medicine OPD vs. complaint type (GI/respiratory/dermatological etc.), going beyond generic SOCRATES.
- **Genuine multilingual handling**: Hindi-English code-switching (not just a language toggle), because that's how patients actually speak in Indian OPDs.
- **Clinical-safety-first architecture**: every AI-derived field carries a confidence indicator; low-confidence outputs are flagged for human verification rather than silently entered. No AI output reaches the medical record unflagged.
- **Doctor-centric summary, not just data dump**: a "30-second overview" card — red flags at top, current complaint, key history, allergies, AI summary — with one-click accept/amend/reject *per section*, not just whole-document approval.

## 3. Complete Feature List (MVP-tagged)

### Must-build (PS-explicit, demo-critical)
- ABHA/Aadhaar ID lookup + new registration
- Language selection
- Consent flow (audio-guided, granular, plain-language explanation before consent — genuine informed consent, not a checkbox)
- Voice + touch dual-mode Q&A
- Adaptive/branching history engine (rule-based decision trees, department- and complaint-specific)
- SOCRATES-style probing + AYUSH Dashavidha Pariksha module
- Red-flag detection → immediate triage alert (patient pulled from routine queue)
- Document upload + OCR
- Clinical entity extraction (medicines, allergies, complaints)
- Medical timeline generation across visits
- Structured physician summary
- Doctor edit/confirm/reject (per-section, not whole-document)
- ABDM/FHIR push (mocked/sandbox acceptable)
- Session data cleanup
- Doctor dashboard ("30-second overview" card)

### Should-build (simplified/partial versions acceptable for MVP)
- Contradiction/incomplete-answer detection → automatic clarifying follow-up
- Confidence scoring per extracted field (naive threshold-based is fine)
- Document quality/duplicate checks
- Audit trail (basic append-only log, not a full framework)
- RBAC (see §6 — this ended up being a full dynamic engine, not "basic")
- Triage staff dashboard (simple version)
- Longitudinal patient timeline (2-3 mock past visits sufficient for demo)
- Assisted/caregiver mode (family member/staff drives interview on patient's behalf — must be logged in audit trail, never silently)
- Medicine-name normalization (brand↔generic, spelling variants) against a static drug reference table
- "Needs human verification" flag on low-confidence OCR/NLP output
- Allergy-conflict, duplicate-medication, and drug-interaction warnings (shown to physician, never auto-acted-on)
- Missing-critical-history warning (e.g., diabetic patient with no medication history)

### Could-build / explicitly cut for MVP (don't spend hackathon hours here)
- Offline/poor-connectivity mode beyond a basic local-queue stub
- Full production-grade ABDM sandbox integration (mock the FHIR push, log payload as "would send")
- Fully offline ASR/OCR in local languages
- Custom code-switch logic beyond what the hosted Whisper API gives for free
- QR/token session-resume (simplified version only if time allows)
- Admin analytics dashboard (simplified version only if time allows)

### Explicitly out of scope
- Autonomous AI diagnosis — legally/ethically unacceptable per PS
- Blockchain or novelty tech for its own sake — no PS benefit
- **WhatsApp integration** — deliberately deferred to a future/separate module (likely use cases identified: appointment reminders, session-resume links, lightweight intake bot — not designed yet, not blocking current build)

## 4. Failure & Fallback Flows (carried over from PS analysis, still authoritative)

| Scenario | Fallback |
|---|---|
| No ABHA ID | Register with Aadhaar/mobile; offer to create ABHA later |
| Aadhaar/detail lookup fails | Manual demographic entry, staff-assisted |
| No internet | Local queue of session data; sync when connectivity restored |
| Voice not recognized | Fall back to touch-only; repeat prompt audio |
| Mixed-language speech | Best-effort code-switch parsing; clarifying question in detected dominant language |
| Noisy environment | Prompt touch mode; noise-robust ASR as first line |
| Speech impairment | Caregiver-assisted or staff-assisted mode |
| Can't use touchscreen | Full voice-only mode; staff-assisted fallback |
| OCR fails/handwriting unreadable | Mark "needs human verification"; manual review |
| Blurry document | Prompt re-scan; accept with low-confidence flag if unavailable |
| Conflicting documents | Show both to doctor with dates; never auto-resolve |
| Contradictory patient history | Clarifying follow-up; if unresolved, flag both answers for doctor |
| AI uncertain (low confidence) | Leave field blank/flagged rather than guess |
| Red flag detected | Immediate priority alert to triage staff |
| Patient refuses consent | Administrative-only registration; no clinical AI capture |
| Patient leaves mid-session | Session saved with QR/token; resumable; partial data flagged "incomplete" |
| ABDM API unavailable | Queue FHIR bundle locally; retry with backoff |
| HIS API unavailable | Same local queue/retry; summary still available from local DB |

## 5. Final Tech Stack

| Layer | Choice | Reasoning |
|---|---|---|
| Patient-facing UI | React + Vite, **PWA** (service worker + manifest, mobile-installable — explicit requirement) | Mobile access needed; PWA avoids app-store friction while still installing like a native app on hospital tablets/phones |
| Backend | Python + FastAPI | AI workload (STT, extraction, OCR calls) is Python-native; async-first, fast to build in hackathon time |
| Primary DB | PostgreSQL | Relational integrity needed: ABHA↔session↔document↔timeline↔role↔permission FKs; JSONB for flexible question-tree answers |
| Session/ephemeral state | **None — Redis deliberately cut.** Session state lives in Postgres with `expires_at`; single-instance WebSocket broadcast handles real-time push | Redis was justified for multi-instance pub/sub and fast key-expiry at scale — neither applies to a single-VM hackathon deployment. Re-evaluate only if scaling beyond one backend instance. |
| STT | **Hosted Whisper API** (e.g., Groq's Whisper endpoint) — not self-hosted | Self-hosting risks live inference bugs/setup time during the build window; hosted API is a single HTTP call, fast, and cost is irrelevant at demo scale. Handles Hindi-English code-switch better than Web Speech API. |
| Branching/question engine | **Rule-based decision trees**, JSON-defined per complaint type/department — explicitly NOT LLM-driven | Non-negotiable architectural boundary — see §7 |
| Clarifying-question phrasing, summary generation, structured data extraction from conversation/documents | LLM API call (Claude/GPT), scoped narrowly | Safe use of non-determinism: doesn't affect what question is asked next or what data is recorded, only phrasing/summarization. Also used for structured JSON extraction of medicines/entities, replacing a separate spaCy/med-NER pipeline (redundant given LLM is already in the loop) |
| OCR | **Google Vision API only** (Tesseract dropped) | Indian prescriptions are handwritten; Tesseract's handwriting accuracy is poor; maintaining a two-engine fallback is production-grade complexity not needed for a demo |
| Clinical NER / drug matching | LLM structured extraction + a **static Indian drug reference table** for allergy/interaction validation | Avoids maintaining a second ML stack (spaCy/med-NER) redundant with the LLM already used elsewhere |
| Auth | JWT (`user_id`, `hospital_id`, `role_id` claims only — **no permission list baked in**) | Permissions must be live-checked against DB so admin changes take effect immediately (see §6.3) |
| Multi-tenancy / hospital identity | `hospital_id` scoping throughout | Required by the multi-hospital RBAC model (§6) |
| ABHA/ABDM integration | ABDM sandbox APIs; mocked fallback if sandbox onboarding isn't approved in time | Real approval process is multi-day; interface built to sandbox spec so it's correct, demo doesn't block on external approval |
| Real-time push (doctor dashboard, red-flag alerts) | Native WebSocket (no Socket.io) | Socket.io's reconnection/room-management/multi-transport features are unnecessary for one doctor dashboard connection in a demo; native WebSocket or 3s polling gives the same visible effect |
| File storage | Local disk, path reference stored in Postgres row | Sufficient for hackathon scale; OCR pipeline needs an input source, doctor dashboard's "click to source document" needs a link target |
| Deployment | Docker Compose, single VM (Render/Railway) | One predictable URL for judges; no multi-service orchestration to babysit during judging |

## 6. User Hierarchy & Dynamic RBAC (full design)

### 6.1 Hierarchy
```
Super Admin (1, platform-level, system-protected — cannot be deleted/renamed)
   Manages: hospital onboarding, Hospital Admin accounts, platform-wide analytics
   Explicitly does NOT have access to patient clinical data (privacy boundary)

   Hospital Admin (≥1 per hospital, system-protected role — last one cannot be deleted)
        Manages, scoped to their own hospital only:
          - Custom roles (create/edit/delete)
          - Permission grants per role
          - Staff/doctor account creation & approval
          - Registration mode setting for their hospital

        Custom Roles (fully admin-defined per hospital — e.g. Doctor, Nurse,
        Receptionist, Triage Staff, Ayurveda Specialist, or anything else the
        hospital wants to name)
             Each role = a set of (Module, Action) permission grants

   Patient (session-based, not an admin-managed role — tied to ABHA/session)
```

### 6.2 Data model
```
hospitals
  id, name, status, registration_mode  -- 'admin_only' | 'self_register' | 'both'

users
  id, hospital_id (null for Super Admin), role_id, name, email/phone,
  status  -- 'active' | 'pending_approval' | 'suspended'

roles
  id, hospital_id (null = system-protected: Super Admin / Hospital Admin),
  name, is_protected (bool), created_by

modules            -- fixed, code-defined, seeded once (maps to real features/endpoints)
  id, name          -- e.g. "patient_intake", "doctor_dashboard", "role_management",
                        "ocr_documents", "clinical_timeline", "staff_management",
                        "analytics", "abdm_integration"

permissions         -- the fully dynamic grant table; this is what makes RBAC "editable"
  id, role_id, module_id,
  can_view, can_create, can_edit, can_delete

pending_registrations
  id, hospital_id, requested_role_id, status, submitted_at

audit_log
  id, role_id, module_id, changed_field, old_value, new_value, changed_by, timestamp
```

Modules themselves are fixed in code (they correspond to real API endpoints/UI screens that actually exist). What's 100% dynamic is the Role × Module × Action grant matrix — no hardcoded `if role == "doctor"` checks anywhere.

### 6.3 Permission check flow — important implementation detail
Permission lists are **not** embedded in the JWT. JWT carries only `user_id`, `hospital_id`, `role_id`. Every protected API call does a live lookup: `has_permission(role_id, module, action)` against the `permissions` table. Route protection is generic — `@requires_permission("patient_records", "edit")` — never role-name-specific. This ensures an admin revoking/granting a permission takes effect immediately, without requiring re-login. (No Redis cache layer added for this — a plain indexed Postgres query is fast enough at hackathon scale.)

### 6.4 Account creation flows (hospital admin chooses per hospital, both supported simultaneously)
- **Admin-creates:** Hospital Admin fills a form (name, contact, assign role) → account active immediately.
- **Self-register + approve:** user signs up, selects a requested role → lands in `pending_registrations` → Hospital Admin approval queue → admin confirms/changes role, activates.
- Controlled by `hospitals.registration_mode`.

### 6.5 Safeguards
- Protected roles (`is_protected=true`: Super Admin, Hospital Admin) cannot be deleted/renamed via UI or API.
- Last-remaining-Hospital-Admin-for-a-hospital cannot be deleted/demoted (lockout prevention).
- A role cannot be deleted while active users hold it — must reassign users first.
- Super Admin scope explicitly excludes patient clinical data access — stated design boundary, not just an omission.
- All permission changes (grant/revoke, per role) are recorded in `audit_log` — who changed what, when.
- **Open decision, recommended default:** a Hospital Admin should not be able to grant a custom role more permissions than the Admin's own role has (prevents privilege escalation via a newly created custom role). Not yet locked — flag in PRD as a decision point if not finalized before drafting.

### 6.6 Still-open items (unresolved as of this document — flag in PRD as TBD)
- Staff/doctor login mechanism: password vs OTP vs magic-link — not yet decided, affects auth module scope.
- Super Admin login: separate portal/subdomain vs. same login page with role-based redirect — not yet decided.

## 7. Core Architectural Tradeoff — "What Bends vs. What Never Bends"

**Never bends:** The branching question engine (what question is asked next, in what order) is rule-based, not LLM-generated.
- Deterministic → identical demo behavior on repeated runs.
- Auditable → the exact tree producing a given interview is inspectable.
- Directly enforces the PS's own constraint against autonomous AI diagnosis — an LLM choosing question order based on inferred likely diagnosis is functionally making a diagnostic inference even without stating one.

**Never bends:** Low-confidence AI output (OCR, NER, STT) is flagged, never silently entered into the medical record. The doctor's decision-making path must never receive unflagged low-confidence data dressed as confident data.

**Bends under time pressure (all in §3's "could-build/cut" list):** ABDM live integration, full offline mode, custom NLU/NER models — infrastructure-completeness concerns, mocked/simplified without compromising the core clinical-safety architecture.

**Anticipated judge question — "why not just let an LLM run the whole interview?"**
Answer: the PS explicitly rules out autonomous AI diagnosis; an LLM freely selecting question order is itself an implicit differential diagnosis even if never stated aloud. Rule-based trees keep all diagnostic reasoning with the doctor; AI is strictly scoped to collect, structure, and flag — never to decide clinical direction.

## 8. Known Gaps to Address Before/During Build (not yet designed, flag explicitly)
- **Seed/demo data script**: pre-populated fake patients, mock ABHA IDs, 2-3 past visits per patient for timeline demo, sample prescription/lab images for live OCR — must be built early, not last, or the demo depends on slow live data entry in front of judges.
- **Demo resilience wrapper**: fallback/graceful-skip behavior if any external AI call (Whisper, LLM, Vision API) times out or rate-limits mid-demo — not yet built, ~30 min of defensive coding, prevents a dead demo on stage.
- **Env/secrets handling**: `.env` + `python-dotenv`, no hardcoded API keys in shared/screen-shared code.
- WhatsApp integration module — deferred, not designed at all yet.
