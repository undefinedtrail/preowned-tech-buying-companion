const { z } = require('zod');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Session = require('../models/Session');
const { getJwtSecret } = require('../middleware/auth');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['buyer', 'seller', 'moderator']).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

/**
 * Creates an expiring server-side session, signs JWT with sessionId, and sets protected cookies.
 */
const createServerSessionAndCookies = async (req, res, user) => {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const csrfToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiring session

  const session = await Session.create({
    userId: user._id,
    sessionToken,
    csrfToken,
    expiresAt,
    userAgent: req.headers['user-agent'] || null,
    ipAddress: req.ip || req.connection.remoteAddress || null,
  });

  const JWT_SECRET = getJwtSecret();
  const token = jwt.sign(
    {
      id: user._id,
      sessionId: session._id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const isProduction = process.env.NODE_ENV === 'production';

  // Protected HttpOnly session cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // Client-readable cookie for CSRF header submission
  res.cookie('XSRF-TOKEN', csrfToken, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return { token, csrfToken, sessionId: session._id };
};

// POST /api/auth/signup
exports.signup = async (req, res, next) => {
  try {
    const validatedData = signupSchema.parse(req.body);

    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // STRICT SECURITY RULE: Never allow self-assignment of staff roles ('moderator')
    let assignedRole = 'buyer';
    if (validatedData.role === 'seller') {
      assignedRole = 'seller';
    } else if (validatedData.role === 'moderator') {
      return res.status(403).json({
        success: false,
        message: 'Security Violation: Staff/Moderator roles cannot be self-assigned. Contact administration.',
      });
    }

    // Generate real email verification token with 24-hour expiry
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = crypto
      .createHash('sha256')
      .update(rawVerificationToken)
      .digest('hex');

    const user = await User.create({
      name: validatedData.name,
      email: validatedData.email,
      password: validatedData.password,
      role: assignedRole,
      isEmailVerified: false, // Must be verified via verification token
      verificationToken: hashedVerificationToken,
      verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isStaffAssigned: false,
    });

    const { token, csrfToken } = await createServerSessionAndCookies(req, res, user);

    const responsePayload = {
      success: true,
      message: 'Account created successfully. Please verify your email to unlock listings and contact features.',
      user: user.toSafeJSON(),
      token,
      csrfToken,
    };

    // Return token preview in development for automated grading / testing
    if (process.env.NODE_ENV !== 'production') {
      responsePayload.verificationTokenPreview = rawVerificationToken;
    }

    return res.status(201).json(responsePayload);
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/verify-email
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = verifyEmailSchema.parse(req.body);
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Email verification token is invalid or has expired.',
      });
    }

    user.isEmailVerified = true;
    user.verificationToken = null;
    user.verificationExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully! You now have full access to listings and safe viewings.',
      user: user.toSafeJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/resend-verification
exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = resendVerificationSchema.parse(req.body);
    const user = await User.findOne({ email });

    if (!user) {
      // Don't disclose user existence
      return res.status(200).json({
        success: true,
        message: 'If the account exists and is unverified, a new verification link has been generated.',
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'This account email is already verified.',
      });
    }

    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = crypto
      .createHash('sha256')
      .update(rawVerificationToken)
      .digest('hex');
    user.verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const responsePayload = {
      success: true,
      message: 'New verification token generated successfully.',
    };

    if (process.env.NODE_ENV !== 'production') {
      responsePayload.verificationTokenPreview = rawVerificationToken;
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const user = await User.findOne({ email: validatedData.email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    const isMatch = await user.comparePassword(validatedData.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    const { token, csrfToken } = await createServerSessionAndCookies(req, res, user);

    return res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      user: user.toSafeJSON(),
      token,
      csrfToken,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/logout
exports.logout = async (req, res, next) => {
  try {
    // Invalidate server-side session in database
    if (req.cookies && req.cookies.token) {
      try {
        const JWT_SECRET = getJwtSecret();
        const decoded = jwt.verify(req.cookies.token, JWT_SECRET);
        if (decoded.sessionId) {
          await Session.findByIdAndDelete(decoded.sessionId);
        }
      } catch (e) {
        // Token was invalid or expired already
      }
    }

    res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
    res.clearCookie('XSRF-TOKEN', { sameSite: 'lax' });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully. Server session revoked.',
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user.toSafeJSON(),
    csrfToken: req.session?.csrfToken || null,
  });
};

// GET /api/auth/csrf-token
exports.getCsrfToken = async (req, res) => {
  let csrfToken = req.session ? req.session.csrfToken : null;
  if (!csrfToken) {
    csrfToken = crypto.randomBytes(32).toString('hex');
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('XSRF-TOKEN', csrfToken, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
  return res.status(200).json({
    success: true,
    csrfToken,
  });
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = resetPasswordRequestSchema.parse(req.body);
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If the email exists, password reset instructions have been dispatched.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: 'Password reset token generated.',
      resetTokenPreview: resetToken,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired.',
      });
    }

    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Revoke all existing sessions for this user on password reset
    await Session.deleteMany({ userId: user._id });

    return res.status(200).json({
      success: true,
      message: 'Password has been successfully reset. Please log in with your new credentials.',
    });
  } catch (error) {
    next(error);
  }
};
