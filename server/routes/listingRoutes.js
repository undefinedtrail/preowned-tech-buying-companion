const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listingController');
const {
  authenticate,
  optionalAuth,
  requireRole,
  requireVerifiedEmail,
} = require('../middleware/auth');
const { reportLimiter } = require('../middleware/rateLimiter');

// Public listing browsing and details
router.get('/', listingController.getListings);
router.get('/:id', optionalAuth, listingController.getListingById);

// Report a suspicious listing (Authenticated users)
router.post(
  '/:id/report',
  authenticate,
  requireVerifiedEmail,
  reportLimiter,
  listingController.reportListing
);

// Seller protected routes
router.post(
  '/',
  authenticate,
  requireVerifiedEmail,
  requireRole(['seller']),
  listingController.createListing
);

router.patch(
  '/:id',
  authenticate,
  requireVerifiedEmail,
  requireRole(['seller']),
  listingController.updateListing
);

router.post(
  '/:id/evidence',
  authenticate,
  requireVerifiedEmail,
  requireRole(['seller']),
  listingController.submitEvidence
);

router.get(
  '/seller/me',
  authenticate,
  requireRole(['seller']),
  listingController.getMyListings
);

module.exports = router;
