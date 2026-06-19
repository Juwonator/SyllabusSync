# Sprint A Review #4 — auth.js

### Verdict: REJECTED (Needs Major Revision)

Current:

```javascript
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

Problems:

### Issue 1 — Wrong Secret

Your Sprint A JWT utility generates admin tokens using:

```javascript
process.env.JWT_ADMIN_SECRET
```

But auth middleware verifies using:

```javascript
process.env.JWT_SECRET
```

These may not be the same key.

Result:

```text
Token generated
↓
Verification fails
↓
All admin authentication breaks
```

---

### Issue 2 — No Audience Validation

Sprint A JWT includes:

```javascript
aud
iss
```

but auth.js does not validate them.

Should be:

```javascript
jwt.verify(token, secret, {
  audience: process.env.JWT_AUDIENCE,
  issuer: process.env.JWT_ISSUER
});
```

---

### Issue 3 — No Token Type Validation

Sprint A should eventually support:

```text
access token
refresh token
```

Auth middleware must reject refresh tokens.

---

### Issue 4 — No Revocation Check

If an admin is disabled:

```text
token remains valid
```

until expiration.

Need:

```text
JWT jti
↓
revocation lookup
↓
allow / deny
```

later.

---

## auth.js Verdict

❌ Not Approved

---

# Sprint A Review #5 — csrf.js

### Verdict: REJECTED

There is actually a bug in the file you pasted.

This section:

```javascript
const tokenFromHeader = req.get('x-csrf-token') || req.body._csrf;
=== req.csrfToken) {
```

is syntactically broken.

It looks like either:

```javascript
if (tokenFromHeader === req.csrfToken)
```

was truncated,

or the file was partially generated.

---

## Security Issue 1

Current cookie:

```javascript
httpOnly: false
```

This means JavaScript can read it.

If XSS exists:

```text
attacker reads csrf token
↓
csrf protection weakened
```

---

## Security Issue 2

No expiry set.

Should include:

```javascript
maxAge
secure
```

for production.

---

## Security Issue 3

CSRF token not bound to session.

Better:

```text
session
↓
csrf token
↓
validation
```

instead of standalone cookie.

---

## csrf.js Verdict

❌ Not Approved

This file must be regenerated or manually fixed.

---

# Sprint A Review #6 — sessionService.js

### Verdict: PARTIALLY APPROVED

This is actually better than the JWT utility.

It contains:

### createSession()

✅ creates refresh token

✅ stores session

---

### rotateSession()

✅ validates existing session

✅ revokes old session

✅ creates new session

✅ transaction handling

This is good.

---

### revokeSession()

✅ logout support

---

## Major Issue 1 — Missing crypto Import

You use:

```javascript
crypto.randomBytes(...)
```

but I don't see:

```javascript
const crypto = require('crypto');
```

at the top.

This file will crash.

---

## Major Issue 2 — Plaintext Refresh Tokens

Current:

```javascript
refresh_token
```

stored directly.

This matches the migration issue we already found.

Needs:

```text
token
↓
hash
↓
store hash
```

---

## Major Issue 3 — No Logout All Devices

Sprint A requirements included:

```text
logout current session
logout all sessions
admin revoke sessions
```

Current service only handles:

```text
single token revoke
```

Missing:

```javascript
revokeAllSessions(userId)
```

---

## Major Issue 4 — No Session Family Tracking

Refresh rotation exists but:

```text
old session
↓
new session
```

relationship is lost.

Need:

```text
token_family
rotated_from
```

for replay detection.

---

## sessionService Verdict

⚠️ Approved Conceptually

❌ Not Production Ready

---

# Updated Sprint A Status

| Component             | Result  |
| --------------------- | ------- |
| Migration             | ❌       |
| JWT Utility           | ❌       |
| Auth Middleware       | ❌       |
| CSRF Middleware       | ❌       |
| Permission Middleware | ✅       |
| Session Service       | ⚠️      |
| MFA Service           | Missing |
| Audit Service         | Missing |

---
