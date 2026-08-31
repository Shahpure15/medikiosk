# MediKiosk — Smart AYUSH & General OPD Patient Case-Taking System
**Problem Statement 047 | Smart India Hackathon 2026**  
**Team**: f society

MediKiosk is a digital patient history-taking and decision-support kiosk software designed for AYUSH and General OPDs. It automates patient history intake (Voice + Touch dual-mode with Hindi-English code-switching), extracts clinical entities from uploaded prescriptions & lab reports via OCR, flags clinical red-flags for immediate triage, and renders a 30-second physician summary card with per-section edit/confirm controls.

---

## 📁 Repository Architecture

```
medikiosk/
├── index.html               # Central Landing Page for PPT submission & pitch resources
├── frontend/                # React + Vite PWA (Kiosk & Doctor Dashboard UI)
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── components/      # Kiosk Intake, Voice/Touch, OCR Upload, Doctor Dashboard
│       ├── services/        # API client for FastAPI backend
│       └── data/            # Local question trees & mock datasets
└── backend/                 # Python + FastAPI Backend
    ├── main.py              # Application entry point & CORS
    ├── models.py            # PostgreSQL SQLAlchemy models (ABHA, RBAC, Sessions)
    ├── schemas.py           # Pydantic request/response schemas
    ├── routers/             # API Endpoints (Intake, OCR, Summary, RBAC, ABDM)
    ├── services/            # STT (Whisper), OCR (Vision API), Tree Engine
    └── seed_demo_data.py    # Demo data generator script
```

---

## ⚡ Quick Start Instructions

### 1. Backend Setup (FastAPI)
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/Mac:
source .venv/bin/activate

pip install -r requirements.txt
python seed_demo_data.py     # Populate demo records
uvicorn main:app --reload --port 8000
```
Swagger API Docs available at: `http://localhost:8000/docs`

### 2. Frontend Setup (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Kiosk Portal available at: `http://localhost:5173`

---

## 🛡️ Clinical Safety Rule
Per PS 047 guidelines, MediKiosk strictly operates as **decision support**. Autonomous AI diagnosis is explicitly out of scope. AI structures data, parses OCR, and alerts on red flags — the physician retains 100% diagnostic authority.
