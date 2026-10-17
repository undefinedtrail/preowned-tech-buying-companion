const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'preowned_tech_companion_jwt_super_secure_secret_2026_xyz';

/**
 * Verifies JWT token from either HTTP-only cookie or Bearer Authorization header
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

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session token: User does not exist.',
      });
    }

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
 * Optional authentication middleware: parses user if token exists, otherwise continues anonymously
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
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = await User.findById(decoded.id);
    }
  } catch (err) {
    // Continue as guest
    req.user = null;
  }
  next();
};

/**
 * Enforces email verification requirement
 */
const requireVerifiedEmail = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Access restricted: Please verify your email before listing, messaging, or booking viewings.',
    });
  }

  next();
};

/**
 * Enforces Role-Based Access Control (RBAC)
 * @param {Array<string>} roles
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

    next();
  };
};

module.exports = {
  authenticate,
  optionalAuth,
  requireVerifiedEmail,
  requireRole,
};
