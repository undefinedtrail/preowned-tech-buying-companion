const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listingController');
const {
  authenticate,
  optionalAuth,
  requireRole,
  requireVerifiedEmail,
} = require('../middleware/auth');

// Public listing browsing and details
router.get('/', listingController.getListings);
router.get('/:id', optionalAuth, listingController.getListingById);

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
