const assert = require('assert');
const crypto = require('crypto');

// Set dummy encryption key for testing (32-byte hex)
const TEST_KEY = crypto.randomBytes(32).toString('hex');
process.env.MFA_ENCRYPTION_KEY = TEST_KEY;

// Mock database to isolate service logic from actual PG instance
const mockDb = {
  queries: [],
  failedAttemptsCount: 0,
  lastAttemptTime: new Date(),
  userMfaRows: [],
  recoveryCodeRows: [],
  
  query: async function(text, params) {
    this.queries.push({ text, params });
    
    if (text.includes('mfa_failed_attempts')) {
      if (text.includes('INSERT')) {
        this.failedAttemptsCount++;
        return { rowCount: 1, rows: [] };
      }
      if (text.includes('COUNT(*)::int')) {
        return {
          rowCount: 1,
          rows: [{ count: this.failedAttemptsCount, last_attempt: this.lastAttemptTime }]
        };
      }
      if (text.includes('DELETE')) {
        this.failedAttemptsCount = 0;
        return { rowCount: 1, rows: [] };
      }
    }
    if (text.includes('user_mfa')) {
      if (text.includes('SELECT')) {
        return { rowCount: this.userMfaRows.length, rows: this.userMfaRows };
      }
      if (text.includes('INSERT')) {
        this.userMfaRows = [{
          user_id: params[0],
          encrypted_secret: params[1],
          secret_iv: params[2],
          secret_auth_tag: params[3],
          verified: false
        }];
        return { rowCount: 1, rows: [] };
      }
      if (text.includes('UPDATE')) {
        if (this.userMfaRows[0]) {
          this.userMfaRows[0].verified = true;
        }
        return { rowCount: 1, rows: [] };
      }
      if (text.includes('DELETE')) {
        this.userMfaRows = [];
        return { rowCount: 1, rows: [] };
      }
    }
    if (text.includes('recovery_codes')) {
      if (text.includes('SELECT')) {
        return { rowCount: this.recoveryCodeRows.length, rows: this.recoveryCodeRows };
      }
      if (text.includes('INSERT')) {
        this.recoveryCodeRows.push({
          id: this.recoveryCodeRows.length + 1,
          user_id: params[0],
          code_hash: params[1],
          used: false
        });
        return { rowCount: 1, rows: [] };
      }
      if (text.includes('UPDATE')) {
        const id = params[0];
        const match = this.recoveryCodeRows.find(r => r.id === id);
        if (match) match.used = true;
        return { rowCount: 1, rows: [] };
      }
      if (text.includes('DELETE')) {
        this.recoveryCodeRows = [];
        return { rowCount: 1, rows: [] };
      }
    }
    return { rowCount: 0, rows: [] };
  },
  
  connect: async function() {
    return {
      query: async (text, params) => {
        if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
          this.queries.push({ text, params });
          return { rowCount: 0, rows: [] };
        }
        return this.query(text, params);
      },
      release: () => {}
    };
  },
  
  reset: function() {
    this.queries = [];
    this.failedAttemptsCount = 0;
    this.userMfaRows = [];
    this.recoveryCodeRows = [];
    this.lastAttemptTime = new Date();
  }
};

// Swap database with mock
const db = require('../db');
Object.assign(db, mockDb);

const mfaService = require('./mfaService');

async function runTests() {
  console.log('--- STARTING MFA SERVICE UNIT TESTS ---');

  // Test 1: Encryption & Decryption
  console.log('Test 1: Encryption & Decryption...');
  const secret = 'JBSWY3DPEHPK3PXP';
  const encrypted = mfaService.encryptSecret(secret);
  assert.ok(encrypted.encrypted_secret);
  assert.ok(encrypted.secret_iv);
  assert.ok(encrypted.secret_auth_tag);
  
  const decrypted = mfaService.decryptSecret(
    encrypted.encrypted_secret,
    encrypted.secret_iv,
    encrypted.secret_auth_tag
  );
  assert.strictEqual(decrypted, secret, 'Decrypted secret must match original');
  console.log('✓ Passed Encryption & Decryption');

  // Test 2: Base32 Encoding / Decoding
  console.log('Test 2: Base32 Utility...');
  const data = Buffer.from('hello world');
  const encoded = mfaService.base32Encode(data);
  const decoded = mfaService.base32Decode(encoded);
  assert.strictEqual(decoded.toString(), 'hello world', 'Base32 roundtrip must match');
  console.log('✓ Passed Base32 Utility');

  // Test 3: Timing Safe Compare
  console.log('Test 3: Timing-Safe Comparison...');
  assert.ok(mfaService.timingSafeCompare('123456', '123456'));
  assert.ok(!mfaService.timingSafeCompare('123456', '654321'));
  assert.ok(!mfaService.timingSafeCompare('123456', '12345'));
  assert.ok(!mfaService.timingSafeCompare('123456', null));
  console.log('✓ Passed Timing-Safe Comparison');

  // Test 4: TOTP Generation & Verification
  console.log('Test 4: TOTP Generation and Verification...');
  const email = 'admin@syllabussync.com';
  const secretDetails = mfaService.generateSecret(email);
  assert.ok(secretDetails.secret);
  assert.ok(secretDetails.otpauthUrl.includes(encodeURIComponent(email)));
  
  const code = mfaService.generateTOTP(secretDetails.secret);
  assert.strictEqual(code.length, 6, 'TOTP code must be 6 digits');
  
  const isOtpValid = mfaService.verifyTOTP(code, secretDetails.secret);
  assert.ok(isOtpValid, 'TOTP code verification must succeed');
  console.log('✓ Passed TOTP Generation and Verification');

  // Test 5: Pre-enrollment and Recovery Codes
  console.log('Test 5: MFA Pre-enrollment and Recovery Codes...');
  mockDb.reset();
  const userId = 1;
  const codes = await mfaService.enrollMfa(userId, secretDetails.secret);
  assert.strictEqual(codes.length, 8, 'Should generate 8 recovery codes');
  assert.strictEqual(codes[0].length, 32, 'Recovery codes should have 128 bits of entropy (32 hex chars)');
  assert.strictEqual(mockDb.userMfaRows.length, 1);
  assert.strictEqual(mockDb.recoveryCodeRows.length, 8);
  assert.strictEqual(mockDb.userMfaRows[0].verified, false, 'Pre-enrolled MFA should be unverified');
  console.log('✓ Passed MFA Pre-enrollment');

  // Test 6: Verify and Enable MFA
  console.log('Test 6: Verify and Enable MFA...');
  const verifyRes = await mfaService.verifyAndEnableMfa(userId, code);
  assert.ok(verifyRes.success, 'Verification should succeed with correct TOTP code');
  assert.strictEqual(mockDb.userMfaRows[0].verified, true, 'MFA should be marked as verified');
  console.log('✓ Passed Verify and Enable');

  // Test 7: Lockout Workflow
  console.log('Test 7: Account Lockout after 5 failures...');
  mockDb.reset();
  
  // Re-enroll user
  await mfaService.enrollMfa(userId, secretDetails.secret);
  
  // Simulate 4 failed attempts
  for (let i = 0; i < 4; i++) {
    const res = await mfaService.verifyAndEnableMfa(userId, '000000');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.message, 'Invalid verification code.');
  }
  
  // 5th failed attempt should trigger lockout
  const lockoutTriggerRes = await mfaService.verifyAndEnableMfa(userId, '000000');
  assert.strictEqual(lockoutTriggerRes.success, false);
  assert.strictEqual(lockoutTriggerRes.message, 'Invalid verification code.');
  
  // A correct code during lockout should be rejected
  const correctCode = mfaService.generateTOTP(secretDetails.secret);
  const blockedRes = await mfaService.verifyAndEnableMfa(userId, correctCode);
  assert.strictEqual(blockedRes.success, false, 'Should block verification during lockout');
  assert.strictEqual(blockedRes.message, 'Invalid verification code.', 'Generic message returned during lockout');
  console.log('✓ Passed Account Lockout Workflow');

  // Test 8: Recovery Code Validation
  console.log('Test 8: Recovery Code Validation...');
  mockDb.reset();
  
  const recoveryCodes = await mfaService.enrollMfa(userId, secretDetails.secret);
  
  // Validate correct recovery code
  const validRecoveryRes = await mfaService.validateRecoveryCode(userId, recoveryCodes[0]);
  assert.ok(validRecoveryRes.success, 'Valid recovery code should be accepted');
  assert.strictEqual(mockDb.recoveryCodeRows[0].used, true, 'Used recovery code should be marked as used');
  
  // Re-use of the same recovery code should fail
  const reuseRecoveryRes = await mfaService.validateRecoveryCode(userId, recoveryCodes[0]);
  assert.strictEqual(reuseRecoveryRes.success, false, 'Used recovery code should be rejected');
  console.log('✓ Passed Recovery Code Validation');

  console.log('--- ALL MFA SERVICE TESTS PASSED ---');
}

runTests().catch(err => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
