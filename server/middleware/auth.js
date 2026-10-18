const jwt = require('jsonwebtoken');
const User = require('../models/User');
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
 * Authenticates requests using either server-side session cookies or Bearer JWT token.
 * Validates that active server-side session exists in the database and is not expired.
 */
const authenticate = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to continue.',
      });
    }

    const JWT_SECRET = getJwtSecret();
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify user exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session token: User does not exist.',
      });
    }

    // MANDATORY SERVER SESSIONS: Reject any JWT that does not contain a valid sessionId
    if (!decoded.sessionId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session token: Missing mandatory server-side session identifier.',
      });
    }

    // Every authenticated request must verify corresponding MongoDB Session exists, is unrevoked, and is unexpired
    const activeSession = await Session.findOne({
      _id: decoded.sessionId,
      userId: user._id,
      expiresAt: { $gt: new Date() },
    });

    if (!activeSession) {
      return res.status(401).json({
        success: false,
        message: 'Session expired or revoked by server. Please log in again.',
      });
    }

    req.session = activeSession;
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed or session expired. Please re-authenticate.',
      error: error.message,
    });
  }
};

/**
 * Optional authentication: parses user/session if present, continues as guest if not.
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const JWT_SECRET = getJwtSecret();
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user && decoded.sessionId) {
        const activeSession = await Session.findOne({
          _id: decoded.sessionId,
          userId: user._id,
          expiresAt: { $gt: new Date() },
        });
        if (activeSession) {
          req.session = activeSession;
          req.user = user;
        }
      }
    }
  } catch (err) {
    req.user = null;
    req.session = null;
  }
  next();
};

/**
 * Enforces email verification requirement
 * Page 2: "Require verified accounts for listing, messaging and viewing requests."
 */
const requireVerifiedEmail = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email Verification Required: Please verify your email before listing, messaging, or booking viewings.',
      isEmailVerified: false,
    });
  }

  next();
};

/**
 * Enforces Role-Based Access Control (RBAC)
 * Protects staff/moderator endpoints with additional isStaffAssigned check
 */
const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: This resource requires one of [${roles.join(', ')}] roles. Your current role is '${req.user.role}'.`,
      });
    }

    // Extra security rule: If accessing moderator functionality, ensure administrator assigned staff status
    if (roles.includes('moderator') && req.user.role === 'moderator' && !req.user.isStaffAssigned) {
      return res.status(403).json({
        success: false,
        message: 'Security Violation: Moderator status is administrator-assigned only.',
      });
    }

    next();
  };
};

module.exports = {
  getJwtSecret,
  authenticate,
  optionalAuth,
  requireVerifiedEmail,
  requireRole,
};
