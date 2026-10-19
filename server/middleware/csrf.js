const jwt = require('jsonwebtoken');
const Session = require('../models/Session');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable must be set in production!');
    }
    return 'preowned_tech_companion_jwt_super_secure_secret_2026_xyz';
  }
  return secret;
};

/**
 * CSRF Protection Middleware for Cookie-based Sessions
 * Enforces X-CSRF-Token verification on all state-changing operations
 * when session authentication cookies are present.
 * Requires BOTH a valid CSRF header and a matching server-side session in MongoDB.
 */
const verifyCsrf = async (req, res, next) => {
  try {
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

      if (!csrfHeader) {
        return res.status(403).json({
          success: false,
          message: 'CSRF Protection: Missing X-CSRF-Token header on state-changing request.',
        });
      }

      // Look up server-side session in MongoDB
      let activeSession = null;
      try {
        if (req.cookies.token) {
          const decoded = jwt.verify(req.cookies.token, getJwtSecret());
          if (decoded && decoded.sessionId) {
            activeSession = await Session.findOne({
              _id: decoded.sessionId,
              expiresAt: { $gt: new Date() },
            });
          }
        } else if (req.cookies.sessionId) {
          activeSession = await Session.findOne({
            _id: req.cookies.sessionId,
            expiresAt: { $gt: new Date() },
          });
        }
      } catch (err) {
        activeSession = null;
      }

      if (!activeSession || !activeSession.csrfToken) {
        return res.status(403).json({
          success: false,
          message: 'CSRF Protection: No valid session CSRF token available for verification.',
        });
      }

      if (csrfHeader !== activeSession.csrfToken) {
        return res.status(403).json({
          success: false,
          message: 'CSRF Protection: Invalid CSRF token provided.',
        });
      }

      req.session = activeSession;
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyCsrf,
};

