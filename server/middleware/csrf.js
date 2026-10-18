/**
 * CSRF Protection Middleware for Cookie-based Sessions
 * Enforces X-CSRF-Token verification on all state-changing operations
 * when session authentication cookies are present.
 */

const verifyCsrf = (req, res, next) => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Exempt unauthenticated public endpoints (e.g. initial login, initial signup)
  const isAuthPublicRoute =
    req.path === '/api/auth/login' ||
    req.path === '/api/auth/signup' ||
    req.path === '/api/auth/forgot-password' ||
    req.path === '/api/auth/reset-password' ||
    req.path === '/api/auth/verify-email';

  if (isAuthPublicRoute) {
    return next();
  }

  // If request is purely API-token authenticated via Bearer Authorization header,
  // it is not vulnerable to ambient browser cookie CSRF.
  const hasBearerHeader =
    req.headers.authorization && req.headers.authorization.startsWith('Bearer ');
  const hasCookieAuth = Boolean(req.cookies && (req.cookies.token || req.cookies.sessionId));

  if (hasBearerHeader && !hasCookieAuth) {
    return next();
  }

  if (hasCookieAuth) {
    const csrfHeader =
      req.headers['x-csrf-token'] ||
      req.headers['x-xsrf-token'] ||
      req.headers['csrf-token'];

    // Require valid server-side session CSRF token
    const sessionCsrf = req.session ? req.session.csrfToken : (req.cookies ? req.cookies['XSRF-TOKEN'] : null);

    if (!csrfHeader) {
      return res.status(403).json({
        success: false,
        message: 'CSRF Protection: Missing X-CSRF-Token header on state-changing request.',
      });
    }

    if (!sessionCsrf) {
      return res.status(403).json({
        success: false,
        message: 'CSRF Protection: No valid session CSRF token available for verification.',
      });
    }

    if (csrfHeader !== sessionCsrf) {
      return res.status(403).json({
        success: false,
        message: 'CSRF Protection: Invalid CSRF token provided.',
      });
    }
  }

  next();
};

module.exports = {
  verifyCsrf,
};
