const express = require('express');
const router = express.Router();
const buyerController = require('../controllers/buyerController');
const {
  authenticate,
  requireRole,
  requireVerifiedEmail,
} = require('../middleware/auth');
const { contactLimiter } = require('../middleware/rateLimiter');

// Shortlist routes
router.post(
  '/shortlists',
  authenticate,
  requireRole(['buyer']),
  buyerController.addToShortlist
);
router.get(
  '/shortlists',
  authenticate,
  requireRole(['buyer']),
  buyerController.getShortlists
);
router.delete(
  '/shortlists/:id',
  authenticate,
  requireRole(['buyer']),
  buyerController.removeFromShortlist
);

// Inquiry threads
router.post(
  '/listings/:id/questions',
  authenticate,
  requireVerifiedEmail,
  contactLimiter,
  buyerController.askQuestion
);
router.get(
  '/listings/:id/questions',
  authenticate,
  buyerController.getListingQuestions
);
router.get(
  '/buyer/inquiries',
  authenticate,
  buyerController.getMyInquiries
);
router.post(
  '/questions/:threadId/reply',
  authenticate,
  requireVerifiedEmail,
  contactLimiter,
  buyerController.replyQuestion
);

// Safe Viewing Bookings
router.post(
  '/listings/:id/viewings',
  authenticate,
  requireVerifiedEmail,
  contactLimiter,
  buyerController.requestViewing
);
router.get(
  '/buyer/viewings',
  authenticate,
  buyerController.getMyViewings
);
router.patch(
  '/viewings/:id/status',
  authenticate,
  buyerController.updateViewingStatus
);

module.exports = router;
