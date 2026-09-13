const { pool } = require('../config/db');
const logger = require('../utils/logger');

// Audit logging should never break the request, so failures are only logged.
async function recordAudit({ userId, action, entityType, entityId, metadata }) {
  try {
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?)',
      [userId ?? null, action, entityType, entityId ?? null, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (err) {
    logger.warn('Failed to write audit log', { error: err.message, action, entityType });
  }
}

module.exports = { recordAudit };
