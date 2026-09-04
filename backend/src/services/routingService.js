const { query } = require('../db');

/**
 * Deterministic Department Auto-Routing Service
 * Rules table lookup - strictly NO LLM calls per PRD Section 6.6 & 12.
 */
async function resolveDepartment(hospitalId, symptomTags = []) {
  if (!symptomTags || symptomTags.length === 0) {
    // Default fallback to General Medicine if no tags emitted
    const fallbackRes = await query(
      `SELECT id, name FROM departments WHERE hospital_id = $1 AND name ILIKE '%General Medicine%' LIMIT 1`,
      [hospitalId]
    );
    if (fallbackRes.rowCount > 0) {
      return {
        department_id: fallbackRes.rows[0].id,
        department_name: fallbackRes.rows[0].name,
        matched_tag: 'default_fallback',
        priority: 0
      };
    }
    return null;
  }

  // Look up matching rule with highest priority
  const res = await query(
    `SELECT r.department_id, r.symptom_tag, r.priority, d.name as department_name
     FROM department_routing_rules r
     JOIN departments d ON r.department_id = d.id
     WHERE r.hospital_id = $1 AND r.symptom_tag = ANY($2::text[])
     ORDER BY r.priority DESC
     LIMIT 1`,
    [hospitalId, symptomTags]
  );

  if (res.rowCount > 0) {
    return {
      department_id: res.rows[0].department_id,
      department_name: res.rows[0].department_name,
      matched_tag: res.rows[0].symptom_tag,
      priority: res.rows[0].priority
    };
  }

  // Fallback if no matching tag
  const genMedRes = await query(
    `SELECT id, name FROM departments WHERE hospital_id = $1 LIMIT 1`,
    [hospitalId]
  );
  return {
    department_id: genMedRes.rows[0]?.id || null,
    department_name: genMedRes.rows[0]?.name || 'General OPD',
    matched_tag: 'unmatched_general',
    priority: 0
  };
}

module.exports = {
  resolveDepartment
};
