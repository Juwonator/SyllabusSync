const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'syllabus-sync';
const JWT_ISSUER = process.env.JWT_ISSUER || 'syllabus-sync';
const ACCESS_TOKEN_TTL = '15m'; // 15-minute TTL

/**
 * Generate a cryptographically secure random string for the jti claim.
 * @returns {string}
 */
function generateJti() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generates a 15-minute JWT access token.
 * 
 * Payload structure:
 * - sub: User ID
 * - role: User role string
 * - permissions: Array of permission strings
 * - type: 'access'
 * - jti: Unique token identifier
 * 
 * @param {Object} user - The user object containing id, role, and permissions.
 * @returns {string} The signed JWT access token.
 */
function generateAccessToken(user) {
  if (!user || !user.id) {
    throw new Error('User ID (id) is required to generate an access token.');
  }

  const payload = {
    sub: user.id.toString(),
    role: user.role || null,
    permissions: user.permissions || [],
    type: 'access',
    jti: generateJti()
  };

  const options = {
    expiresIn: ACCESS_TOKEN_TTL,
    audience: JWT_AUDIENCE,
    issuer: JWT_ISSUER
  };

  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Verifies a JWT access token.
 * Validates signature, audience, issuer, expiry, and token type.
 * 
 * @param {string} token - The access token to verify.
 * @returns {Object} The decoded payload if verification succeeds.
 * @throws {Error} If verification fails or token type is invalid.
 */
function verifyAccessToken(token) {
  if (!token) {
    throw new Error('Token is required.');
  }

  const options = {
    audience: JWT_AUDIENCE,
    issuer: JWT_ISSUER
  };

  const decoded = jwt.verify(token, JWT_SECRET, options);

  if (decoded.type !== 'access') {
    throw new Error('Invalid token type');
  }

  return decoded;
}

module.exports = {
  generateAccessToken,
  verifyAccessToken
};
