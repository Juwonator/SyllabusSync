const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');

// --- Base32 Utility Functions (Zero-Dependency) ---

/**
 * Decode a Base32 string to a Buffer.
 * @param {string} str - Base32 encoded string.
 * @returns {Buffer} Decoded byte buffer.
 */
function base32Decode(str) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = str.replace(/=+$/, '').toUpperCase();
  let bits = '';
  let buffer = [];

  for (let i = 0; i < cleaned.length; i++) {
    const val = alphabet.indexOf(cleaned[i]);
    if (val === -1) {
      throw new Error('Invalid base32 character: ' + cleaned[i]);
    }
    bits += val.toString(2).padStart(5, '0');
  }

  for (let i = 0; i + 8 <= bits.length; i += 8) {
    const chunk = bits.substring(i, i + 8);
    buffer.push(parseInt(chunk, 2));
  }

  return Buffer.from(buffer);
}

/**
 * Encode a Buffer to a Base32 string.
 * @param {Buffer} buffer - Byte buffer to encode.
 * @returns {string} Base32 encoded string.
 */
function base32Encode(buffer) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (let i = 0; i < buffer.length; i++) {
    bits += buffer[i].toString(2).padStart(8, '0');
  }

  let encoded = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5);
    if (chunk.length < 5) {
      encoded += alphabet[parseInt(chunk.padEnd(5, '0'), 2)];
    } else {
      encoded += alphabet[parseInt(chunk, 2)];
    }
  }

  // Standard Base32 padding
  while (encoded.length % 8 !== 0) {
    encoded += '=';
  }

  return encoded;
}

// --- TOTP Generation & Verification (RFC 6238) ---

/**
 * Generate a 6-digit TOTP code for a secret at a specific time.
 * @param {string} secretBase32 - Base32 encoded secret.
 * @param {number} [timeStep=30] - Time step in seconds.
 * @param {number} [time=Date.now()] - Timestamp to calculate code for.
 * @returns {string} 6-digit OTP.
 */
function generateTOTP(secretBase32, timeStep = 30, time = Date.now()) {
  const key = base32Decode(secretBase32);
  const epoch = Math.floor(time / 1000);
  const counter = Math.floor(epoch / timeStep);

  const counterBuf = Buffer.alloc(8);
  const high = Math.floor(counter / 0x100000000);
  const low = counter % 0x100000000;
  counterBuf.writeUInt32BE(high, 0);
  counterBuf.writeUInt32BE(low, 4);

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(counterBuf);
  const hmacResult = hmac.digest();

  const offset = hmacResult[hmacResult.length - 1] & 0x0f;
  const codeBin = ((hmacResult[offset] & 0x7f) << 24) |
                  ((hmacResult[offset + 1] & 0xff) << 16) |
                  ((hmacResult[offset + 2] & 0xff) << 8) |
                  (hmacResult[offset + 3] & 0xff);

  const otp = codeBin % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Timing-safe string comparison of two strings.
 * Converts strings to buffers and compares them in constant time.
 * @param {string} str1
 * @param {string} str2
 * @returns {boolean}
 */
function timingSafeCompare(str1, str2) {
  if (typeof str1 !== 'string' || typeof str2 !== 'string') {
    return false;
  }
  const buf1 = Buffer.from(str1, 'utf8');
  const buf2 = Buffer.from(str2, 'utf8');
  if (buf1.length !== buf2.length) {
    // Run dummy comparison to mitigate timing attacks
    crypto.timingSafeEqual(buf1, buf1);
    return false;
  }
  return crypto.timingSafeEqual(buf1, buf2);
}

/**
 * Verify a TOTP code against a secret.
 * @param {string} token - The 6-digit TOTP code.
 * @param {string} secretBase32 - The Base32-encoded secret.
 * @param {number} [window=1] - Acceptable step offset to account for clock drift.
 * @returns {boolean} True if token is valid.
 */
function verifyTOTP(token, secretBase32, window = 1) {
  if (!token || !secretBase32) return false;
  const time = Date.now();
  let matchFound = false;
  for (let i = -window; i <= window; i++) {
    const calculated = generateTOTP(secretBase32, 30, time + (i * 30 * 1000));
    const isMatch = timingSafeCompare(calculated, token);
    if (isMatch) {
      matchFound = true;
    }
  }
  return matchFound;
}

// --- AES-256-GCM Encryption / Decryption ---

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt a plaintext secret using AES-256-GCM.
 * @param {string} plaintextSecret
 * @returns {Object} { encrypted_secret, secret_iv, secret_auth_tag }
 */
function encryptSecret(plaintextSecret) {
  const keyHex = process.env.MFA_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('Invalid or missing MFA_ENCRYPTION_KEY environment variable. Must be a 32-byte hex string.');
  }
  const key = Buffer.from(keyHex, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintextSecret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return {
    encrypted_secret: encrypted,
    secret_iv: iv.toString('hex'),
    secret_auth_tag: authTag
  };
}

/**
 * Decrypt an encrypted secret using AES-256-GCM.
 * @param {string} encryptedSecret
 * @param {string} ivHex
 * @param {string} authTagHex
 * @returns {string} Plaintext secret.
 */
function decryptSecret(encryptedSecret, ivHex, authTagHex) {
  const keyHex = process.env.MFA_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('Invalid or missing MFA_ENCRYPTION_KEY environment variable. Must be a 32-byte hex string.');
  }
  const key = Buffer.from(keyHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedSecret, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// --- Account Lockout Helpers ---

/**
 * Record a failed MFA verification attempt.
 * @param {number} userId
 */
async function recordFailedAttempt(userId) {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute window
  await db.query(
    'INSERT INTO mfa_failed_attempts (user_id, expires_at) VALUES ($1, $2)',
    [userId, expiresAt]
  );
}

/**
 * Check if the user's MFA is currently locked out.
 * Locks after 5 failed attempts within a 15-minute window, lasting for 30 minutes from the last attempt.
 * @param {number} userId
 * @returns {Promise<boolean>}
 */
async function isMfaLocked(userId) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count, MAX(attempt_time) AS last_attempt
     FROM mfa_failed_attempts
     WHERE user_id = $1 AND attempt_time >= NOW() - INTERVAL '15 minutes'`,
    [userId]
  );
  if (result.rows.length === 0) return false;
  const { count, last_attempt } = result.rows[0];
  if (count >= 5) {
    const lockoutEnd = new Date(new Date(last_attempt).getTime() + 30 * 60 * 1000);
    if (lockoutEnd > new Date()) {
      return true;
    }
  }
  return false;
}

// --- Recovery Codes Helpers (Bcrypt with Cost 12) ---

/**
 * Generate 8 recovery codes with 128-bit entropy (32 hex characters).
 * @returns {Array<string>} Array of plaintext recovery codes.
 */
function generateRecoveryCodes() {
  const codes = [];
  for (let i = 0; i < 8; i++) {
    // 16 bytes = 128 bits
    codes.push(crypto.randomBytes(16).toString('hex'));
  }
  return codes;
}

/**
 * Hash a recovery code using bcrypt with cost factor 12.
 * @param {string} code - The plaintext recovery code.
 * @returns {Promise<string>} Bcrypt hash.
 */
async function hashRecoveryCode(code) {
  return bcrypt.hash(code, 12);
}

/**
 * Compare a plaintext recovery code to its bcrypt hash.
 * @param {string} code
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function compareRecoveryCode(code, hash) {
  return bcrypt.compare(code, hash);
}

// --- MFA Service Methods ---

/**
 * Generate a new TOTP secret and QR code/OTPAuth URI.
 * @param {string} email - User email for the URI label.
 * @returns {Object} { secret, otpauthUrl }
 */
function generateSecret(email) {
  if (!email) {
    throw new Error('Email is required to generate MFA secret.');
  }
  const rawSecret = crypto.randomBytes(20);
  const secret = base32Encode(rawSecret);
  const issuer = 'SyllabusSync';
  const label = `${issuer}:${email}`;
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
  return { secret, otpauthUrl };
}

/**
 * Pre-enroll a user in MFA (inserts secret as unverified, and generates/stores recovery codes).
 * Runs in a database transaction.
 * @param {number} userId
 * @param {string} secret - The generated Base32 secret.
 * @returns {Promise<Array<string>>} Plaintext recovery codes to show to the user.
 */
async function enrollMfa(userId, secret) {
  if (!userId || !secret) {
    throw new Error('userId and secret are required for pre-enrollment.');
  }

  const encryptedInfo = encryptSecret(secret);

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Delete any existing MFA/recovery code records
    await client.query('DELETE FROM user_mfa WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM recovery_codes WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM mfa_failed_attempts WHERE user_id = $1', [userId]);

    // 2. Insert new unverified secret
    await client.query(
      `INSERT INTO user_mfa (user_id, encrypted_secret, secret_iv, secret_auth_tag, verified) 
       VALUES ($1, $2, $3, $4, FALSE)`,
      [userId, encryptedInfo.encrypted_secret, encryptedInfo.secret_iv, encryptedInfo.secret_auth_tag]
    );

    // 3. Generate recovery codes
    const plainCodes = generateRecoveryCodes();
    for (const code of plainCodes) {
      const hash = await hashRecoveryCode(code);
      await client.query(
        'INSERT INTO recovery_codes (user_id, code_hash, used) VALUES ($1, $2, FALSE)',
        [userId, hash]
      );
    }

    await client.query('COMMIT');
    return plainCodes;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Verifies the unverified code and enables MFA for the user.
 * Runs in a transaction.
 * @param {number} userId
 * @param {string} code - The TOTP verification code.
 * @returns {Promise<Object>} Verification status object.
 */
async function verifyAndEnableMfa(userId, code) {
  if (!userId || !code) {
    return { success: false, message: 'Invalid verification code.' };
  }

  const client = await db.connect();
  try {
    // Clean up expired failed attempts
    await client.query('DELETE FROM mfa_failed_attempts WHERE expires_at < NOW()');

    // Check lockout
    const locked = await isMfaLocked(userId);
    if (locked) {
      return { success: false, message: 'Invalid verification code.' };
    }

    await client.query('BEGIN');

    // Fetch the unverified MFA secret
    const res = await client.query(
      'SELECT encrypted_secret, secret_iv, secret_auth_tag, verified FROM user_mfa WHERE user_id = $1',
      [userId]
    );

    if (res.rowCount === 0) {
      console.error(`[MFA] User ${userId} attempted to enable MFA but has not pre-enrolled.`);
      await client.query('ROLLBACK');
      await recordFailedAttempt(userId);
      return { success: false, message: 'Invalid verification code.' };
    }

    const { encrypted_secret, secret_iv, secret_auth_tag, verified } = res.rows[0];
    if (verified) {
      console.error(`[MFA] User ${userId} attempted to enable MFA but it is already enabled.`);
      await client.query('ROLLBACK');
      await recordFailedAttempt(userId);
      return { success: false, message: 'Invalid verification code.' };
    }

    const secret = decryptSecret(encrypted_secret, secret_iv, secret_auth_tag);

    // Verify code
    const isValid = verifyTOTP(code, secret);
    if (!isValid) {
      await client.query('ROLLBACK');
      await recordFailedAttempt(userId);
      return { success: false, message: 'Invalid verification code.' };
    }

    // Update verified status in user_mfa
    await client.query(
      'UPDATE user_mfa SET verified = TRUE WHERE user_id = $1',
      [userId]
    );

    // Enable in users table
    await client.query(
      'UPDATE users SET mfa_enabled = TRUE WHERE id = $1',
      [userId]
    );

    // Clear failed attempts upon success
    await client.query(
      'DELETE FROM mfa_failed_attempts WHERE user_id = $1',
      [userId]
    );

    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[MFA Error] verifyAndEnableMfa failed:', err.message);
    return { success: false, message: 'Invalid verification code.' };
  } finally {
    client.release();
  }
}

/**
 * Verify a TOTP code for a user (during login flow).
 * @param {number} userId
 * @param {string} code
 * @returns {Promise<Object>} Verification status object.
 */
async function verifyMfa(userId, code) {
  if (!userId || !code) {
    return { success: false, message: 'Invalid verification code.' };
  }

  try {
    // Clean up expired failed attempts
    await db.query('DELETE FROM mfa_failed_attempts WHERE expires_at < NOW()');

    // Check lockout
    const locked = await isMfaLocked(userId);
    if (locked) {
      return { success: false, message: 'Invalid verification code.' };
    }

    // Fetch verified secret
    const res = await db.query(
      'SELECT encrypted_secret, secret_iv, secret_auth_tag FROM user_mfa WHERE user_id = $1 AND verified = TRUE',
      [userId]
    );

    if (res.rowCount === 0) {
      console.error(`[MFA] User ${userId} attempted MFA verification but is not enrolled/verified.`);
      await recordFailedAttempt(userId);
      return { success: false, message: 'Invalid verification code.' };
    }

    const { encrypted_secret, secret_iv, secret_auth_tag } = res.rows[0];
    const secret = decryptSecret(encrypted_secret, secret_iv, secret_auth_tag);

    const isValid = verifyTOTP(code, secret);
    if (!isValid) {
      await recordFailedAttempt(userId);
      return { success: false, message: 'Invalid verification code.' };
    }

    // Success: clear failed attempts
    await db.query('DELETE FROM mfa_failed_attempts WHERE user_id = $1', [userId]);
    return { success: true };
  } catch (err) {
    console.error('[MFA Error] verifyMfa failed:', err.message);
    return { success: false, message: 'Invalid verification code.' };
  }
}

/**
 * Disables MFA for the user and removes associated secrets and recovery codes.
 * Runs in a transaction.
 * @param {number} userId
 * @returns {Promise<void>}
 */
async function disableMfa(userId) {
  if (!userId) {
    throw new Error('userId is required to disable MFA.');
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Remove MFA records
    await client.query('DELETE FROM user_mfa WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM recovery_codes WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM mfa_failed_attempts WHERE user_id = $1', [userId]);

    // Update users table
    await client.query(
      'UPDATE users SET mfa_enabled = FALSE WHERE id = $1',
      [userId]
    );

    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[MFA Error] disableMfa failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Validates a recovery code. If valid and unused, marks it as used and returns true.
 * @param {number} userId
 * @param {string} code - The plaintext recovery code to validate.
 * @returns {Promise<Object>} Verification status object.
 */
async function validateRecoveryCode(userId, code) {
  if (!userId || !code) {
    return { success: false, message: 'Invalid verification code.' };
  }

  try {
    // Clean up expired failed attempts
    await db.query('DELETE FROM mfa_failed_attempts WHERE expires_at < NOW()');

    // Check lockout
    const locked = await isMfaLocked(userId);
    if (locked) {
      return { success: false, message: 'Invalid verification code.' };
    }

    // Fetch all unused recovery codes for the user
    const res = await db.query(
      'SELECT id, code_hash FROM recovery_codes WHERE user_id = $1 AND used = FALSE',
      [userId]
    );

    let matchedId = null;
    for (const row of res.rows) {
      const isMatch = await compareRecoveryCode(code, row.code_hash);
      if (isMatch) {
        matchedId = row.id;
        break;
      }
    }

    if (!matchedId) {
      await recordFailedAttempt(userId);
      return { success: false, message: 'Invalid verification code.' };
    }

    // Mark as used
    await db.query(
      'UPDATE recovery_codes SET used = TRUE WHERE id = $1',
      [matchedId]
    );

    // Clear failed attempts upon success
    await db.query('DELETE FROM mfa_failed_attempts WHERE user_id = $1', [userId]);

    return { success: true };
  } catch (err) {
    console.error('[MFA Error] validateRecoveryCode failed:', err.message);
    return { success: false, message: 'Invalid verification code.' };
  }
}

module.exports = {
  generateSecret,
  verifyTOTP,
  enrollMfa,
  verifyAndEnableMfa,
  verifyMfa,
  disableMfa,
  validateRecoveryCode,
  // Export utility functions for testing if needed
  base32Encode,
  base32Decode,
  generateTOTP,
  timingSafeCompare,
  encryptSecret,
  decryptSecret,
  isMfaLocked,
  recordFailedAttempt
};
