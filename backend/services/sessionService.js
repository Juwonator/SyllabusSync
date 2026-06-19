const crypto = require('crypto');
const db = require('../db');

/**
 * Hash a refresh token with SHA-256 before storing.
 * @param {string} token – plaintext refresh token
 * @returns {string} hex-encoded hash
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create a new session with a fresh refresh token.
 * Stores only the hashed token in the database.
 *
 * @param {number} userId
 * @param {string} userAgent
 * @param {string} ipAddress
 * @returns {Promise<{ refreshToken: string, tokenFamily: string }>}
 */
async function createSession(userId, userAgent, ipAddress) {
  const refreshToken = crypto.randomBytes(48).toString('hex');
  const tokenFamily = crypto.randomUUID();
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.query(
    `INSERT INTO user_sessions (user_id, refresh_token_hash, token_family, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, tokenHash, tokenFamily, userAgent, ipAddress, expiresAt]
  );

  return { refreshToken, tokenFamily };
}

/**
 * Rotate an existing refresh token: revoke old, issue new within the same family.
 * If the old token has already been revoked (replay attack), revoke the entire family.
 *
 * @param {string} oldToken – plaintext refresh token from cookie
 * @param {string} userAgent
 * @param {string} ipAddress
 * @returns {Promise<{ refreshToken: string, userId: number }>}
 * @throws if token is invalid, expired, or a replay is detected
 */
async function rotateRefreshToken(oldToken, userAgent, ipAddress) {
  const oldHash = hashToken(oldToken);

  // Find the session by hash
  const result = await db.query(
    `SELECT id, user_id, token_family, revoked_at
       FROM user_sessions
      WHERE refresh_token_hash = $1 AND expires_at > NOW()`,
    [oldHash]
  );

  if (result.rowCount === 0) {
    throw new Error('Invalid or expired refresh token');
  }

  const session = result.rows[0];

  // Replay detection: if the token was already revoked, an attacker may be
  // replaying a stolen token. Revoke the entire family as a precaution.
  if (session.revoked_at) {
    await db.query(
      `UPDATE user_sessions SET revoked_at = NOW()
        WHERE token_family = $1 AND revoked_at IS NULL`,
      [session.token_family]
    );
    throw new Error('Refresh token reuse detected – all sessions in family revoked');
  }

  // Issue new token in the same family
  const newToken = crypto.randomBytes(48).toString('hex');
  const newHash = hashToken(newToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.query('BEGIN');
  try {
    // Revoke old session
    await db.query(
      'UPDATE user_sessions SET revoked_at = NOW() WHERE id = $1',
      [session.id]
    );
    // Insert new session linked to old
    await db.query(
      `INSERT INTO user_sessions (user_id, refresh_token_hash, token_family, rotated_from, user_agent, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [session.user_id, newHash, session.token_family, session.id, userAgent, ipAddress, expiresAt]
    );
    await db.query('COMMIT');
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }

  return { refreshToken: newToken, userId: session.user_id };
}

/**
 * Revoke a single session (logout current device).
 * @param {string} token – plaintext refresh token from cookie
 */
async function revokeSession(token) {
  const tokenHash = hashToken(token);
  await db.query(
    `UPDATE user_sessions SET revoked_at = NOW()
      WHERE refresh_token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash]
  );
}

/**
 * Revoke ALL sessions for a user (logout all devices / admin force-logout).
 * @param {number} userId
 */
async function revokeAllSessions(userId) {
  await db.query(
    `UPDATE user_sessions SET revoked_at = NOW()
      WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

/**
 * Verify a refresh token and return the associated user_id.
 * @param {string} token – plaintext refresh token from cookie
 * @returns {Promise<number>} userId
 * @throws if token is invalid/expired/revoked
 */
async function verifyRefreshToken(token) {
  const tokenHash = hashToken(token);
  const result = await db.query(
    `SELECT user_id FROM user_sessions
      WHERE refresh_token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
    [tokenHash]
  );
  if (result.rowCount === 0) {
    throw new Error('Invalid or expired refresh token');
  }
  return result.rows[0].user_id;
}

module.exports = {
  createSession,
  rotateRefreshToken,
  revokeSession,
  revokeAllSessions,
  verifyRefreshToken,
  hashToken,
};
