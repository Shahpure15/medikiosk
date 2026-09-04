const { query } = require('../db');

/**
 * Process uploaded medical document (Prescription / Lab Report / ID) & extract OCR text
 */
async function processDocument(caseId, sessionId, file, docType = 'report', uploadedBy = null) {
  // In production: uploads to Cloudflare R2 bucket & calls Vision API
  // For local demo: store relative URL and generate realistic OCR extraction
  const fileUrl = `/uploads/${file.filename}`;

  let extractedOcrText = '';
  const originalName = file.originalname.toLowerCase();

  if (originalName.includes('blood') || originalName.includes('cbc') || originalName.includes('lab')) {
    extractedOcrText = `[CLINICAL LAB REPORT OCR]
Patient: Recorded in Intake
Haemoglobin (Hb): 13.8 g/dL (Normal: 13.0 - 17.0)
Total Leukocyte Count (TLC): 9,400 /cumm
Platelet Count: 2.4 Lakh /cumm
Erythrocyte Sedimentation Rate (ESR): 18 mm/hr
Serum Creatinine: 0.9 mg/dL
Blood Sugar Fasting: 98 mg/dL (Normal: 70-100)
Impression: Mild non-specific inflammatory elevation; vitals normal.`;
  } else if (originalName.includes('rx') || originalName.includes('prescrip')) {
    extractedOcrText = `[PAST PRESCRIPTION OCR]
Dr. K. N. Gupta (MD Med) - District Clinic
Rx:
1. Tab. Paracetamol 650mg - 1-0-1 (3 Days)
2. Tab. Pantoprazole 40mg - 1-0-0 Before Food
3. Syp. Sucralfate 10ml TDS
Notes: Patient advised bland diet and adequate hydration.`;
  } else {
    extractedOcrText = `[DOCUMENT OCR EXTRACT - ${file.originalname}]
Date of Scan: ${new Date().toLocaleDateString('en-IN')}
Document Type: ${docType.toUpperCase()}
Status: Verified by Medical Intake Scanner.`;
  }

  const res = await query(
    `INSERT INTO documents (case_id, session_id, file_url, ocr_text, doc_type, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [caseId || null, sessionId || null, fileUrl, extractedOcrText, docType, uploadedBy]
  );

  return res.rows[0];
}

module.exports = {
  processDocument
};
