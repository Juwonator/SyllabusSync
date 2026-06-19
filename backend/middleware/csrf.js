const crypto = require('crypto');

/**
 * CSRF Protection Middleware (Double-Submit Cookie pattern, session-bound).
 *
 * How it works:
 *   1. generateCsrfToken – on every request, generates or reuses a CSRF token
 *      stored in an HttpOnly cookie. The token is tied to the session by also
 *      being available via req.csrfToken for server-side rendering or via the
 *      GET /api/auth/csrf-token endpoint.
 *   2. validateCsrf – on state-changing requests (POST/PUT/PATCH/DELETE),
 *      compares the x-csrf-token header against the cookie value using
 *      timing-safe comparison.
 */

/**
 * Generate a CSRF token and set it as an HttpOnly, Secure, SameSite=Strict cookie.
 * Also exposes req.csrfToken for server-side usage.
 */
function generateCsrfToken(req, res, next) {
  const existingToken = req.cookies && req.cookies['__csrf'];
  if (existingToken) {
    req.csrfToken = existingToken;
  } else {
    const token = crypto.randomBytes(32).toString('hex');
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('__csrf', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });
    req.csrfToken = token;
  }
  next();
}

/**
 * Validate CSRF token on state-changing requests.
 * Safe methods (GET, HEAD, OPTIONS) are allowed through.
 */
function validateCsrf(req, res, next) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method.toUpperCase())) {
    return next();
  }

  const cookieToken = req.cookies && req.cookies['__csrf'];
  const headerToken = req.get('x-csrf-token');

  if (!cookieToken || !headerToken) {
    return res.status(403).json({ message: 'CSRF token missing.' });
  }

  // Timing-safe comparison to prevent timing attacks
  const cookieBuf = Buffer.from(cookieToken);
  const headerBuf = Buffer.from(headerToken);

  if (cookieBuf.length !== headerBuf.length || !crypto.timingSafeEqual(cookieBuf, headerBuf)) {
    return res.status(403).json({ message: 'Invalid CSRF token.' });
  }

  next();
}

module.exports = { generateCsrfToken, validateCsrf };
