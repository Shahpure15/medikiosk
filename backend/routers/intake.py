from fastapi import APIRouter, HTTPException
from schemas import ABHALookupResponse, IntakeSessionSubmit
from services.tree_engine import tree_engine
import uuid

router = APIRouter(prefix="/intake", tags=["Patient Intake"])

@router.get("/abha/{abha_id}", response_model=ABHALookupResponse)
def lookup_patient_abha(abha_id: str):
    return {
        "success": True,
        "patient": {
            "abha_id": abha_id,
            "name": "Preet Sharma",
            "age": 34,
            "gender": "Male",
            "phone": "+91 98765 43210",
            "prakriti": "Pitta-Vata",
            "previous_visits": 3
        }
    }

@router.post("/submit")
def submit_intake(data: IntakeSessionSubmit):
    session_id = f"SESS-{uuid.uuid4().hex[:6].upper()}"
    eval_result = tree_engine.evaluate_answers(data.department, data.answers)
    
    return {
        "session_id": session_id,
        "status": "queued",
        "red_flags": eval_result["red_flags"],
        "message": "Session recorded and queued for Doctor Dashboard review"
    }
