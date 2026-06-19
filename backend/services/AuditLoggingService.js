const pool = require('../db');

const ACTION_TYPES = [
    'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT',
    'MFA_ENABLE', 'MFA_DISABLE', 'PERMISSION_CHANGE', 'ROLE_CHANGE'
];

function validateAction(action) {
    if (!ACTION_TYPES.includes(action)) {
        throw new Error(`Invalid action type: ${action}. Must be one of: ${ACTION_TYPES.join(', ')}`);
    }
}

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || '0.0.0.0';
}

class AuditLoggingService {
    static logAction(params) {
        const {
            userId,
            userEmail,
            action,
            entityType = null,
            entityId = null,
            ipAddress = null,
            userAgent = null,
            metadata = {},
            requestId = null,
            correlationId = null,
            req = null
        } = params;

        validateAction(action);

        let finalIp = ipAddress;
        let finalUa = userAgent;
        if (req) {
            if (!finalIp) finalIp = getClientIp(req);
            if (!finalUa) finalUa = req.headers['user-agent'] || null;
        }

        let sanitizedMetadata = metadata;
        if (typeof sanitizedMetadata !== 'object' || sanitizedMetadata === null) {
            sanitizedMetadata = {};
        }
        delete sanitizedMetadata.password;
        delete sanitizedMetadata.token;
        delete sanitizedMetadata.secret;

        setImmediate(async () => {
            try {
                const query = `
                    INSERT INTO admin_audit_logs (
                        user_id, user_email, action, entity_type, entity_id,
                        ip_address, user_agent, metadata, request_id, correlation_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `;
                const values = [
                    userId,
                    userEmail,
                    action,
                    entityType,
                    entityId,
                    finalIp,
                    finalUa,
                    sanitizedMetadata,
                    requestId,
                    correlationId
                ];
                await pool.query(query, values);
            } catch (error) {
                console.error('[AuditLoggingService] Failed to write audit log:', error.message);
            }
        });

        return { success: true };
    }

    static async getAuditLogs(filters = {}) {
        const {
            userId,
            action,
            startDate,
            endDate,
            entityType,
            entityId,
            requestId,
            correlationId,
            limit = 50,
            offset = 0
        } = filters;

        const MAX_LIMIT = 1000;
        const safeLimit = Math.min(limit, MAX_LIMIT);
        const safeOffset = Math.max(offset, 0);

        const conditions = [];
        const values = [];
        let paramIndex = 1;

        if (userId) {
            conditions.push(`user_id = $${paramIndex++}`);
            values.push(userId);
        }
        if (action) {
            validateAction(action);
            conditions.push(`action = $${paramIndex++}`);
            values.push(action);
        }
        if (startDate) {
            conditions.push(`created_at >= $${paramIndex++}`);
            values.push(startDate);
        }
        if (endDate) {
            conditions.push(`created_at <= $${paramIndex++}`);
            values.push(endDate);
        }
        if (entityType) {
            conditions.push(`entity_type = $${paramIndex++}`);
            values.push(entityType);
        }
        if (entityId) {
            conditions.push(`entity_id = $${paramIndex++}`);
            values.push(entityId);
        }
        if (requestId) {
            conditions.push(`request_id = $${paramIndex++}`);
            values.push(requestId);
        }
        if (correlationId) {
            conditions.push(`correlation_id = $${paramIndex++}`);
            values.push(correlationId);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countQuery = `SELECT COUNT(*) AS total FROM admin_audit_logs ${whereClause}`;
        const countResult = await pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].total, 10);

        const dataQuery = `
            SELECT 
                id, user_id, user_email, action, entity_type, entity_id,
                ip_address, user_agent, metadata, request_id, correlation_id, created_at
            FROM admin_audit_logs
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;
        values.push(safeLimit, safeOffset);

        const dataResult = await pool.query(dataQuery, values);

        return {
            logs: dataResult.rows,
            total,
            limit: safeLimit,
            offset: safeOffset
        };
    }

    static async getAuditTrail(userId, limit = 100, offset = 0) {
        return this.getAuditLogs({ userId, limit, offset });
    }

    static async getAdminAuditTrail(adminId, limit = 100, offset = 0) {
        return this.getAuditLogs({ userId: adminId, limit, offset });
    }

    static async cleanExpiredLogs(daysToKeep = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const query = `DELETE FROM admin_audit_logs WHERE created_at < $1 RETURNING id`;
        const result = await pool.query(query, [cutoffDate.toISOString()]);
        const deletedCount = result.rowCount || 0;

        console.log(`[AuditLoggingService] Cleaned up ${deletedCount} audit log entries older than ${daysToKeep} days.`);
        return deletedCount;
    }
}

module.exports = {
    AuditLoggingService,
    ACTION_TYPES,
    getClientIp,
    validateAction
};