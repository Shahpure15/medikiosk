const { query } = require('../db');
const { resolveDepartment } = require('./routingService');
const { issueToken } = require('./queueService');

/**
 * Start or Resume Patient Intake Case
 */
async function getOrStartCase(sessionId, hospitalId, preselectedDepartmentId = null) {
  let caseRes = await query(
    `SELECT c.*, d.name as department_name, s.is_kiosk_verified
     FROM cases c
     JOIN patient_sessions s ON c.session_id = s.id
     LEFT JOIN departments d ON c.department_id = d.id
     WHERE c.session_id = $1 AND c.status IN ('intake', 'ready_for_doctor', 'in_consult')
     ORDER BY c.created_at DESC LIMIT 1`,
    [sessionId]
  );

  let currentCase;
  if (caseRes.rowCount > 0) {
    currentCase = caseRes.rows[0];
  } else {
    const resolvedBy = preselectedDepartmentId ? 'patient_selected' : null;
    const newCaseRes = await query(
      `INSERT INTO cases (session_id, hospital_id, department_id, department_resolved_by, status)
       VALUES ($1, $2, $3, $4, 'intake')
       RETURNING *`,
      [sessionId, hospitalId, preselectedDepartmentId, resolvedBy]
    );
    currentCase = newCaseRes.rows[0];
  }

  // Fetch appropriate question flow tree
  let flowRes;
  if (currentCase.department_id && currentCase.department_resolved_by === 'patient_selected') {
    flowRes = await query(
      `SELECT * FROM question_flows WHERE department_id = $1 AND is_active = true ORDER BY version DESC LIMIT 1`,
      [currentCase.department_id]
    );
  }

  if (!flowRes || flowRes.rowCount === 0) {
    flowRes = await query(
      `SELECT * FROM question_flows WHERE department_id IS NULL AND is_active = true ORDER BY version DESC LIMIT 1`
    );
  }

  const flow = flowRes?.rows[0];
  const tree = flow ? (typeof flow.tree === 'string' ? JSON.parse(flow.tree) : flow.tree) : null;

  // Derive current question node from prior responses
  const respRes = await query(
    `SELECT * FROM case_responses WHERE case_id = $1 ORDER BY created_at ASC`,
    [currentCase.id]
  );
  const responses = respRes.rows;

  let currentNodeId = tree ? tree.root_node_id : null;
  for (const resp of responses) {
    const node = tree?.nodes?.[resp.question_id];
    if (node && node.options) {
      const matchedOption = node.options.find(
        opt => opt.id === resp.answer_text || 
               opt.label?.en?.toLowerCase() === resp.answer_text.toLowerCase() ||
               opt.label?.hi === resp.answer_text
      ) || node.options[0];

      if (matchedOption && matchedOption.next_node) {
        currentNodeId = matchedOption.next_node;
      }
    }
  }

  const currentNode = tree && currentNodeId ? tree.nodes[currentNodeId] : null;

  return {
    case: currentCase,
    flow_id: flow?.id,
    current_node: currentNode,
    is_terminal: currentNode?.is_terminal || false,
    tree_nodes: tree?.nodes,
    root_node_id: tree?.root_node_id,
    responses
  };
}

/**
 * Submit Answer & Advance Decision Tree
 */
async function submitAnswer(caseId, questionId, answerText, answerType = 'touch', extractedViaLlm = false) {
  const caseRes = await query(`SELECT * FROM cases WHERE id = $1`, [caseId]);
  if (caseRes.rowCount === 0) {
    throw new Error(`Case not found for id: ${caseId}`);
  }
  const currentCase = caseRes.rows[0];

  let flowRes;
  if (currentCase.department_id && currentCase.department_resolved_by === 'patient_selected') {
    flowRes = await query(
      `SELECT * FROM question_flows WHERE department_id = $1 AND is_active = true ORDER BY version DESC LIMIT 1`,
      [currentCase.department_id]
    );
  }
  if (!flowRes || flowRes.rowCount === 0) {
    flowRes = await query(
      `SELECT * FROM question_flows WHERE department_id IS NULL AND is_active = true ORDER BY version DESC LIMIT 1`
    );
  }

  const flow = flowRes?.rows[0];
  const tree = flow ? (typeof flow.tree === 'string' ? JSON.parse(flow.tree) : flow.tree) : null;

  // Insert response
  await query(
    `INSERT INTO case_responses (case_id, question_id, answer_text, answer_type, extracted_via_llm)
     VALUES ($1, $2, $3, $4, $5)`,
    [caseId, questionId, answerText, answerType, extractedViaLlm]
  );

  // Traverse next node in code
  const currentNode = tree?.nodes?.[questionId];
  let nextNodeId = null;

  if (currentNode && currentNode.options) {
    const matchedOpt = currentNode.options.find(
      opt => opt.id === answerText || 
             opt.label?.en?.toLowerCase() === answerText.toLowerCase() ||
             opt.label?.hi === answerText
    ) || currentNode.options[0];

    nextNodeId = matchedOpt?.next_node || null;
  }

  const nextNode = nextNodeId ? tree?.nodes?.[nextNodeId] : null;
  const isTerminal = nextNode?.is_terminal || false;

  let resolvedDepartment = null;

  if (isTerminal && nextNode.symptom_tags) {
    if (!currentCase.department_id || currentCase.department_resolved_by === 'auto_routed') {
      resolvedDepartment = await resolveDepartment(currentCase.hospital_id, nextNode.symptom_tags);
      if (resolvedDepartment) {
        await query(
          `UPDATE cases 
           SET department_id = $1, 
               department_resolved_by = 'auto_routed',
               chief_complaint = $2
           WHERE id = $3`,
          [resolvedDepartment.department_id, nextNode.message?.en || 'General Assessment', caseId]
        );
      }
    } else {
      await query(
        `UPDATE cases SET chief_complaint = $1 WHERE id = $2`,
        [nextNode.message?.en || 'Consultation Intake', caseId]
      );
    }
  }

  return {
    success: true,
    next_node: nextNode,
    is_terminal: isTerminal,
    symptom_tags: nextNode?.symptom_tags || [],
    resolved_department: resolvedDepartment
  };
}

/**
 * Complete Intake & Enter Queue (subject to Hospital physical_presence_required Setting)
 */
async function completeIntake(caseId) {
  const caseRes = await query(
    `SELECT c.*, s.is_kiosk_verified, s.hospital_id, h.physical_presence_required
     FROM cases c
     JOIN patient_sessions s ON c.session_id = s.id
     JOIN hospitals h ON s.hospital_id = h.id
     WHERE c.id = $1`,
    [caseId]
  );

  if (caseRes.rowCount === 0) {
    throw new Error('Case not found');
  }

  const caseData = caseRes.rows[0];

  // Check Hospital Physical Presence Setting
  const requiresPresence = caseData.physical_presence_required !== false;

  if (requiresPresence && !caseData.is_kiosk_verified) {
    return {
      status: 'presence_verification_required',
      is_kiosk_verified: false,
      message: 'Physical presence required. Please scan the QR code on any hospital kiosk to enter the OPD queue.'
    };
  }

  let departmentId = caseData.department_id;
  if (!departmentId) {
    const deptFallback = await query(
      `SELECT id FROM departments WHERE hospital_id = $1 LIMIT 1`,
      [caseData.hospital_id]
    );
    departmentId = deptFallback.rows[0]?.id;
    await query(`UPDATE cases SET department_id = $1 WHERE id = $2`, [departmentId, caseId]);
  }

  const token = await issueToken(caseId, caseData.hospital_id, departmentId);

  return {
    status: 'queued',
    is_kiosk_verified: true,
    token
  };
}

module.exports = {
  getOrStartCase,
  submitAnswer,
  completeIntake
};
