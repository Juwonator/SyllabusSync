const db = require('../db');
const { verifyAccessToken } = require('../utils/jwt');

/**
 * Authentication middleware.
 *
 * 1. Extracts Bearer token from Authorization header.
 * 2. Verifies signature, audience, issuer, and expiry via utils/jwt.
 * 3. Rejects non‑access tokens (e.g. refresh tokens).
 * 4. Checks the jti against the revoked_tokens table.
 * 5. Checks if the user account is locked.
 * 6. Attaches role and permissions (from token or DB fallback) to req.user.
 */
module.exports = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Access denied. Please login.' });
  }

  try {
    // Verify signature + audience + issuer + type
    const decoded = verifyAccessToken(token);

    // Check if token has been revoked (jti blacklist)
    if (decoded.jti) {
      const revoked = await db.query(
        'SELECT 1 FROM revoked_tokens WHERE jti = $1',
        [decoded.jti]
      );
      if (revoked.rowCount > 0) {
        return res.status(401).json({ message: 'Token has been revoked.' });
      }
    }

    // Check account lockout
    const userResult = await db.query(
      'SELECT locked_until FROM users WHERE id = $1',
      [decoded.sub]
    );
    if (userResult.rowCount > 0) {
      const lockedUntil = userResult.rows[0].locked_until;
      if (lockedUntil && new Date(lockedUntil) > new Date()) {
        return res.status(403).json({ message: 'Account is temporarily locked.' });
      }
    }

    // Build req.user – prefer token claims, fallback to DB
    req.user = {
      id: decoded.sub,
      role: decoded.role,
      permissions: decoded.permissions || [],
      jti: decoded.jti,
    };

    // If role/permissions are missing from the token, fetch from DB
    if (!decoded.role || !decoded.permissions) {
      const permResult = await db.query(
        `SELECT u.role, array_agg(p.name) AS permissions
           FROM users u
           LEFT JOIN role_permissions rp ON rp.role_id = (SELECT id FROM roles WHERE name = u.role)
           LEFT JOIN permissions p ON p.id = rp.permission_id
          WHERE u.id = $1
          GROUP BY u.id, u.role`,
        [decoded.sub]
      );
      if (permResult.rows.length > 0) {
        req.user.role = permResult.rows[0].role;
        req.user.permissions = (permResult.rows[0].permissions || []).filter(Boolean);
      }
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please refresh.' });
    }
    res.status(401).json({ message: 'Invalid or expired token. Please login again.' });
  }
};