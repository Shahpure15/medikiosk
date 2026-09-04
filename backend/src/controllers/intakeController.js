const intakeService = require('../services/intakeService');
const voiceLlmService = require('../services/voiceLlmService');
const ocrService = require('../services/ocrService');
const prescriptionService = require('../services/prescriptionService');
const { query } = require('../db');

/**
 * GET /api/intake/session-case
 */
async function getSessionCase(req, res) {
  try {
    const sessionId = req.patientSession.id;
    const hospitalId = req.patientSession.hospital_id;
    const departmentId = req.query.department_id || null;

    const result = await intakeService.getOrStartCase(sessionId, hospitalId, departmentId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/intake/answer
 */
async function submitAnswer(req, res) {
  try {
    const { case_id, question_id, answer_text, answer_type, extracted_via_llm } = req.body;
    if (!case_id || !question_id || !answer_text) {
      return res.status(400).json({ error: 'case_id, question_id, and answer_text are required' });
    }

    const result = await intakeService.submitAnswer(
      case_id,
      question_id,
      answer_text,
      answer_type || 'touch',
      Boolean(extracted_via_llm)
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/intake/voice-map
 * Constrained option mapping
 */
async function voiceOptionMap(req, res) {
  try {
    const { transcript, valid_options, language } = req.body;
    if (!transcript || !valid_options) {
      return res.status(400).json({ error: 'transcript and valid_options required' });
    }
    const result = await voiceLlmService.mapTranscriptToOption(transcript, valid_options, language || 'en');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/intake/upload-doc
 */
async function uploadDocument(req, res) {
  try {
    const { case_id, doc_type } = req.body;
    const sessionId = req.patientSession ? req.patientSession.id : null;
    const uploadedBy = req.user ? req.user.id : null;

    if (!req.file) {
      return res.status(400).json({ error: 'No document file uploaded' });
    }

    const doc = await ocrService.processDocument(case_id, sessionId, req.file, doc_type || 'report', uploadedBy);
    res.json({ message: 'Document uploaded and OCR extracted', document: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/intake/complete
 */
async function completeIntake(req, res) {
  try {
    const { case_id } = req.body;
    if (!case_id) {
      return res.status(400).json({ error: 'case_id is required' });
    }

    const result = await intakeService.completeIntake(case_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/intake/patient-history
 */
async function getPatientHistory(req, res) {
  try {
    const patientId = req.patient.id;
    const hospitalId = req.patient.hospital_id;
    const history = await prescriptionService.getPatientHistory(patientId, hospitalId);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getSessionCase,
  submitAnswer,
  voiceOptionMap,
  uploadDocument,
  completeIntake,
  getPatientHistory
};
