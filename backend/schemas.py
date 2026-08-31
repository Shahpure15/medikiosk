from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime

class ABHALookupResponse(BaseModel):
    success: bool
    patient: Optional[dict] = None
    message: Optional[str] = None

class IntakeSessionSubmit(BaseModel):
    abha_id: str
    patient_name: str
    department: str
    answers: dict

class OCRResponse(BaseModel):
    filename: str
    ocr_status: str
    extracted_entities: dict

class DoctorSummaryResponse(BaseModel):
    session_id: str
    patient_name: str
    red_flags: List[dict]
    current_complaints: List[str]
    ayush_profile: dict
    extracted_medicines: List[dict]
    allergies: List[str]
