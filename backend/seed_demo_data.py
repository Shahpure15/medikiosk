"""
Seed/Demo Data Generator for MediKiosk Demo (PS 047).
Pre-populates sample hospitals, roles, modules, permissions, and fake patient records.
"""
from database import SessionLocal, Base, engine
from models import Hospital, Role, Module, Permission, User, PatientSession
from datetime import datetime, timedelta

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Seed Hospital
    hospital = db.query(Hospital).first()
    if not hospital:
        hospital = Hospital(name="AIIMS New Delhi — AYUSH OPD", registration_mode="both")
        db.add(hospital)
        db.commit()
        db.refresh(hospital)

    # Seed Modules
    modules = ["patient_intake", "doctor_dashboard", "ocr_documents", "clinical_timeline", "abdm_integration"]
    for mod in modules:
        if not db.query(Module).filter(Module.name == mod).first():
            db.add(Module(name=mod))
    db.commit()

    # Seed Demo Patient Session
    demo_session = db.query(PatientSession).filter(PatientSession.id == "SESS-1029").first()
    if not demo_session:
        demo_session = PatientSession(
            id="SESS-1029",
            abha_id="91-8273-1029-4829",
            patient_name="Preet Sharma",
            department="ayush",
            answers_json={
                "q_chief_complaint": "High fever since 3 days with throat congestion and chest tightness",
                "q_prakriti_assessment": "Pitta-Vata",
                "q_ahara_vihara": "Mandagni (Slow digestion), irregular eating"
            },
            red_flags=[
                {"warning": "High Fever (>102°F) with difficulty breathing reported", "severity": "HIGH"}
            ],
            expires_at=datetime.utcnow() + timedelta(hours=24),
            status="pending_review"
        )
        db.add(demo_session)
        db.commit()

    print("✅ Demo Data Seeded Successfully!")
    db.close()

if __name__ == "__main__":
    seed()
