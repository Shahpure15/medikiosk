from fastapi import APIRouter, UploadFile, File
from services.vision_ocr import vision_ocr_service

router = APIRouter(prefix="/ocr", tags=["Document OCR & Clinical NER"])

@router.post("/process")
async def process_document(file: UploadFile = File(...)):
    contents = await file.read()
    result = vision_ocr_service.process_prescription_image(contents, file.filename)
    return result
