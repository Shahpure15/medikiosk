const { query } = require('../db');

/**
 * Dynamic RBAC Permission Checker
 * @param {string} moduleKey - e.g. 'patients', 'cases', 'staff', 'roles', 'hospitals', 'reports', 'documents'
 * @param {string} action - 'create' | 'read' | 'update' | 'delete' | 'approve'
 */
const requirePermission = (moduleKey, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.role_id) {
        return res.status(403).json({ error: 'Access denied: User role undefined' });
      }

      // Live dynamic database query: zero hardcoded role name checks
      const permCheck = await query(
        `SELECT 1 
         FROM permissions p
         JOIN modules m ON p.module_id = m.id
         WHERE p.role_id = $1 AND m.key = $2 AND p.action = $3
         LIMIT 1`,
        [req.user.role_id, moduleKey, action]
      );

      if (permCheck.rowCount > 0) {
        return next();
      }

      return res.status(403).json({
        error: `Permission denied: Role lacks '${action}' authority on '${moduleKey}' module`,
        required_module: moduleKey,
        required_action: action
      });
    } catch (err) {
      console.error('[RBAC Error]', err);
      return res.status(500).json({ error: 'Internal RBAC permission resolution error' });
    }
  };
};

module.exports = {
  requirePermission
};
