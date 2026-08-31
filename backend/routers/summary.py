from fastapi import APIRouter
from schemas import DoctorSummaryResponse

router = APIRouter(prefix="/summary", tags=["Doctor 30-Second Summary Dashboard"])

@router.get("/{session_id}", response_model=DoctorSummaryResponse)
def get_30sec_summary(session_id: str):
    return {
        "session_id": session_id,
        "patient_name": "Preet Sharma (ABHA: 91-8273-1029)",
        "red_flags": [
            {"warning": "High Fever (>102°F) with difficulty breathing reported", "severity": "HIGH"}
        ],
        "current_complaints": [
            "Fever since 3 days (102°F)",
            "Throat congestion & mild chest tightness"
        ],
        "ayush_profile": {
            "prakriti": "Pitta-Vata",
            "agni": "Mandagni (Slow digestion)",
            "lifestyle": "High stress, irregular meal times"
        },
        "extracted_medicines": [
            {"name": "Paracetamol 650mg", "dosage": "1-0-1", "confidence": 0.95},
            {"name": "Tribhuvan Kirti Ras (AYUSH)", "dosage": "2 tabs BD", "confidence": 0.89}
        ],
        "allergies": ["Penicillin (Reported in 2024 visit)"]
    }
