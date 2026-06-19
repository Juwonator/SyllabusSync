const db = require('../db');

/**
 * Log an administrative action to the audit logs.
 *
 * @param {Object} params
 * @param {number} params.adminId - ID of the admin performing the action (actor).
 * @param {string} params.action - Description of the action (e.g. 'user.deactivate', 'question.create').
 * @param {string} [params.targetType] - Type of the entity being acted upon (e.g., 'user', 'question').
 * @param {number} [params.targetId] - ID of the entity being acted upon.
 * @param {Object} [params.details] - Metadata details (JSON serializable).
 * @param {string} [params.ipAddress] - IP address of the request.
 * @param {string} [params.userAgent] - User-Agent header of the request.
 * @returns {Promise<number>} The ID of the inserted audit log entry.
 */
async function logAdminAction({
  adminId,
  action,
  targetType = null,
  targetId = null,
  details = {},
  ipAddress = null,
  userAgent = null
}) {
  if (!adminId || !action) {
    throw new Error('adminId and action are required to log an admin action.');
  }

  const queryText = `
    INSERT INTO admin_audit_logs (
      admin_id, 
      action, 
      target_type, 
      target_id, 
      details, 
      ip_address, 
      user_agent
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `;

  const values = [
    adminId,
    action,
    targetType,
    targetId,
    JSON.stringify(details),
    ipAddress,
    userAgent
  ];

  const result = await db.query(queryText, values);
  return result.rows[0].id;
}

module.exports = {
  logAdminAction
};
