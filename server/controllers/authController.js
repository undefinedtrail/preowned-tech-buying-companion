const { z } = require('zod');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'preowned_tech_companion_jwt_super_secure_secret_2026_xyz';
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

const resetPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const generateTokenAndSetCookie = (res, user) => {
  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return token;
};

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

    const user = await User.create({
      name: validatedData.name,
      email: validatedData.email,
      password: validatedData.password,
      role: assignedRole,
      isEmailVerified: true, // Verified email signup flow
      isStaffAssigned: false,
    });

    const token = generateTokenAndSetCookie(res, user);

    return res.status(201).json({
      success: true,
      message: 'Account created and verified successfully.',
      user: user.toSafeJSON(),
      token,
    });
  } catch (error) {
    next(error);
  }
};

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

    const token = generateTokenAndSetCookie(res, user);

    return res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      user: user.toSafeJSON(),
      token,
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
  });
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};

exports.getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user.toSafeJSON(),
  });
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = resetPasswordRequestSchema.parse(req.body);
    const user = await User.findOne({ email });

    if (!user) {
      // Don't disclose account existence for security
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset instruction has been dispatched.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: 'Password reset token generated.',
      resetTokenPreview: resetToken, // Provided in development for seamless verification
    });
  } catch (error) {
    next(error);
  }
};

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

    return res.status(200).json({
      success: true,
      message: 'Password has been successfully reset. Please log in with your new credentials.',
    });
  } catch (error) {
    next(error);
  }
};
