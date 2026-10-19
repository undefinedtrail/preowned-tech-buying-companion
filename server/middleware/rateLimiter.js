const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 login attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
});

const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many email verification attempts. Please wait 15 minutes.',
  },
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset requests. Please wait 15 minutes.',
  },
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 viewing or message requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many contact/viewing requests submitted. Please slow down.',
  },
});

const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many listing report submissions. Please wait before submitting more reports.',
  },
});

const aiAgentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60, // 60 comparison / chat requests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'AI agent request limit reached. Please wait a few moments before sending another request.',
  },
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // 15 signups per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many account creation requests from this IP. Please try again later.',
  },
});

const semanticSearchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40, // 40 semantic embedding search requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many semantic search queries submitted. Please wait a few moments.',
  },
});

module.exports = {
  loginLimiter,
  signupLimiter,
  verificationLimiter,
  passwordResetLimiter,
  contactLimiter,
  reportLimiter,
  aiAgentLimiter,
  semanticSearchLimiter,
};
