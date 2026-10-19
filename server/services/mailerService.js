const nodemailer = require('nodemailer');

let transporterInstance = null;

function getTransporter() {
  if (!transporterInstance) {
    if (process.env.SMTP_HOST) {
      transporterInstance = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // In development / test without an SMTP server configured, create a mock/stream transporter
      transporterInstance = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
    }
  }
  return transporterInstance;
}

/**
 * Sends an email verification message containing the verification token.
 *
 * @param {string} toEmail
 * @param {string} token Raw verification token
 */
async function sendVerificationEmail(toEmail, token) {
  const fromEmail = process.env.FROM_EMAIL || 'no-reply@preownedtech.local';
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const verifyUrl = `${clientUrl}/verify-email?token=${encodeURIComponent(token)}`;

  const mailOptions = {
    from: `"Preowned Tech Companion" <${fromEmail}>`,
    to: toEmail,
    subject: 'Verify Your Email - Preowned Tech Buying Companion',
    text: `Welcome to Preowned Tech Companion!\n\nPlease verify your email by clicking the link below:\n${verifyUrl}\n\nYour verification token is: ${token}\n\nThis token will expire in 24 hours.`,
    html: `
      <h2>Welcome to Preowned Tech Buying Companion!</h2>
      <p>Please verify your email address to unlock listings, in-app messaging, and safe viewing requests.</p>
      <p><a href="${verifyUrl}" style="padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:5px;">Verify Email Address</a></p>
      <p>Or use your verification token: <code>${token}</code></p>
      <p>This verification token expires in 24 hours.</p>
    `,
  };

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Mailer] Verification email dispatched to ${toEmail}. Token: ${token}`);
    }
    return info;
  } catch (error) {
    console.error(`[Mailer Error] Failed to send verification email to ${toEmail}:`, error.message);
    if (process.env.NODE_ENV === 'production' && process.env.SMTP_HOST) {
      throw error;
    }
  }
}

/**
 * Sends a password reset email with the reset token.
 *
 * @param {string} toEmail
 * @param {string} token Raw reset token
 */
async function sendPasswordResetEmail(toEmail, token) {
  const fromEmail = process.env.FROM_EMAIL || 'no-reply@preownedtech.local';
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const resetUrl = `${clientUrl}/reset-password?token=${encodeURIComponent(token)}`;

  const mailOptions = {
    from: `"Preowned Tech Companion" <${fromEmail}>`,
    to: toEmail,
    subject: 'Password Reset Request - Preowned Tech Buying Companion',
    text: `You have requested to reset your password.\n\nPlease reset your password using the link below:\n${resetUrl}\n\nYour reset token is: ${token}\n\nThis token will expire in 30 minutes. If you did not request this, please ignore this email.`,
    html: `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset for your Preowned Tech Companion account.</p>
      <p><a href="${resetUrl}" style="padding:10px 20px;background:#dc2626;color:#fff;text-decoration:none;border-radius:5px;">Reset Password</a></p>
      <p>Or use your reset token: <code>${token}</code></p>
      <p>This link expires in 30 minutes. If you did not make this request, you can safely ignore this email.</p>
    `,
  };

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Mailer] Password reset email dispatched to ${toEmail}. Token: ${token}`);
    }
    return info;
  } catch (error) {
    console.error(`[Mailer Error] Failed to send password reset email to ${toEmail}:`, error.message);
    if (process.env.NODE_ENV === 'production' && process.env.SMTP_HOST) {
      throw error;
    }
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
