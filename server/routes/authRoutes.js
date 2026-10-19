const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const {
  loginLimiter,
  signupLimiter,
  verificationLimiter,
  passwordResetLimiter,
} = require('../middleware/rateLimiter');

router.post('/signup', signupLimiter, authController.signup);
router.post('/login', loginLimiter, authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);
router.get('/csrf-token', optionalAuth, authController.getCsrfToken);
router.post('/verify-email', verificationLimiter, authController.verifyEmail);
router.post('/resend-verification', verificationLimiter, authController.resendVerification);
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, authController.resetPassword);

module.exports = router;
