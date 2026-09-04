const queueService = require('../services/queueService');
const prescriptionService = require('../services/prescriptionService');
const { query } = require('../db');

/**
 * GET /api/doctor/queue
 */
async function getQueue(req, res) {
  try {
    const hospitalId = req.user.hospital_id;
    const departmentId = req.query.department_id || req.user.department_id || null;
    const queue = await queueService.getDoctorQueue(hospitalId, departmentId);
    res.json(queue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/doctor/queue/:tokenId/call
 */
async function callPatient(req, res) {
  try {
    const { tokenId } = req.params;
    const doctorId = req.user.id;
    const result = await queueService.callPatient(tokenId, doctorId);
    res.json({ message: 'Patient called to room', token: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/doctor/queue/:tokenId/start-consult
 */
async function startConsult(req, res) {
  try {
    const { tokenId } = req.params;
    const result = await queueService.startConsult(tokenId);
    res.json({ message: 'Consultation started', token: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/doctor/queue/:tokenId/no-show
 */
async function markNoShow(req, res) {
  try {
    const { tokenId } = req.params;
    const result = await queueService.markNoShow(tokenId);
    res.json({ message: 'Patient marked as no-show', token: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/doctor/cases/:caseId/consult-card
 */
async function getCaseConsultDetail(req, res) {
  try {
    const { caseId } = req.params;

    // 1. Fetch Case & Patient details
    const caseRes = await query(
      `SELECT c.*, 
              d.name as department_name,
              p.id as patient_id, p.name as patient_name, p.phone as patient_phone, p.age as patient_age, p.gender as patient_gender, p.abha_id as patient_abha_id
       FROM cases c
       LEFT JOIN departments d ON c.department_id = d.id
       JOIN patient_sessions s ON c.session_id = s.id
       JOIN patients p ON s.patient_id = p.id
       WHERE c.id = $1`,
      [caseId]
    );

    if (caseRes.rowCount === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const caseData = caseRes.rows[0];

    // 2. Fetch full intake transcript from case_responses
    const responsesRes = await query(
      `SELECT * FROM case_responses WHERE case_id = $1 ORDER BY created_at ASC`,
      [caseId]
    );

    // 3. Fetch uploaded documents & OCR text
    const docsRes = await query(
      `SELECT * FROM documents WHERE case_id = $1 ORDER BY created_at ASC`,
      [caseId]
    );

    // 4. Fetch prior history for this durable patient
    const priorHistory = await prescriptionService.getPatientHistory(caseData.patient_id, caseData.hospital_id);

    res.json({
      case: caseData,
      transcript: responsesRes.rows,
      documents: docsRes.rows,
      prior_history: priorHistory.filter(h => h.id !== caseId)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/doctor/medicines/search
 */
async function searchMedicines(req, res) {
  try {
    const { q } = req.query;
    const medicines = await prescriptionService.searchMedicines(q || '');
    res.json(medicines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/doctor/prescriptions
 */
async function issuePrescription(req, res) {
  try {
    const { case_id, remarks, next_checkup_date, items } = req.body;
    if (!case_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'case_id and at least one prescription item are required' });
    }

    const doctorId = req.user.id;
    const prescription = await prescriptionService.createPrescription(
      case_id,
      doctorId,
      remarks,
      next_checkup_date,
      items
    );

    res.status(201).json({ message: 'Prescription issued and case completed', prescription });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getQueue,
  callPatient,
  startConsult,
  markNoShow,
  getCaseConsultDetail,
  searchMedicines,
  issuePrescription
};
