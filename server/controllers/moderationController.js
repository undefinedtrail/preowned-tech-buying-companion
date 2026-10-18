const { z } = require('zod');
const Listing = require('../models/Listing');
const PrivateEvidence = require('../models/PrivateEvidence');
const ModerationEvent = require('../models/ModerationEvent');

const moderationActionSchema = z.object({
  action: z.enum([
    'approved',
    'flagged',
    'suspended',
    'reinstated',
    'evidence_verified',
    'evidence_rejected',
    'inconsistency_noted',
  ]),
  reason: z.string().min(5, 'Moderation reason must be at least 5 characters'),
  notes: z.string().optional(),
});

// GET /api/moderation/queue - Get listings requiring moderation attention
exports.getModerationQueue = async (req, res, next) => {
  try {
    const listings = await Listing.find({
      $or: [
        { status: 'pending' },
        { status: 'suspended' },
        { evidenceStatus: 'pending' },
        { reportCount: { $gt: 0 } },
      ],
    })
      .populate('sellerId', 'name email reputationScore')
      .sort({ updatedAt: -1 })
      .lean();

    // Attach private evidence for moderator inspection
    const listingIds = listings.map((l) => l._id);
    const evidences = await PrivateEvidence.find({ listingId: { $in: listingIds } }).lean();
    const evidenceMap = {};
    evidences.forEach((ev) => {
      evidenceMap[ev.listingId.toString()] = ev;
    });

    const enriched = listings.map((l) => ({
      ...l,
      submittedEvidence: evidenceMap[l._id.toString()] || null,
    }));

    return res.status(200).json({
      success: true,
      count: enriched.length,
      listings: enriched,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/listings/:id/moderation - Execute moderation decision
exports.takeModerationAction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, reason, notes } = moderationActionSchema.parse(req.body);

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    const previousStatus = listing.status;
    let newStatus = previousStatus;

    const evidence = await PrivateEvidence.findOne({ listingId: listing._id });

    // Enforce Rule: Moderator CANNOT silently rewrite seller's condition declaration!
    // They can only flag, suspend, reinstate, or verify/reject evidence.
    if (action === 'approved') {
      newStatus = 'active';
      listing.status = 'active';
      listing.moderationNote = notes || `Approved by moderator: ${reason}`;
    } else if (action === 'suspended') {
      newStatus = 'suspended';
      listing.status = 'suspended';
      listing.moderationNote = `Suspended by moderator: ${reason}`;
    } else if (action === 'reinstated') {
      newStatus = 'active';
      listing.status = 'active';
      listing.moderationNote = null;
    } else if (action === 'flagged') {
      listing.reportCount = (listing.reportCount || 0) + 1;
      listing.moderationNote = `Flagged for review: ${reason}`;
    } else if (action === 'evidence_verified') {
      if (evidence) {
        evidence.verificationStatus = 'verified';
        evidence.moderatorNotes = notes || 'Evidence documents verified by staff.';
        evidence.verifiedBy = req.user._id;
        evidence.verifiedAt = new Date();
        await evidence.save();
      }
      listing.evidenceStatus = 'verified';
    } else if (action === 'evidence_rejected') {
      if (evidence) {
        evidence.verificationStatus = 'rejected';
        evidence.moderatorNotes = notes || 'Submitted evidence rejected due to inconsistency.';
        evidence.verifiedBy = req.user._id;
        evidence.verifiedAt = new Date();
        await evidence.save();
      }
      listing.evidenceStatus = 'rejected';
    }

    await listing.save();

    // Record permanent non-destructive audit event
    const event = await ModerationEvent.create({
      listingId: listing._id,
      moderatorId: req.user._id,
      reportedBy: null,
      action,
      reason,
      previousStatus,
      newStatus,
      evidenceId: evidence ? evidence._id : null,
      notes: notes || '',
    });

    return res.status(200).json({
      success: true,
      message: `Moderation decision '${action}' recorded successfully.`,
      moderationEvent: event,
      listingStatus: listing.status,
      evidenceStatus: listing.evidenceStatus,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/listings/:id/moderation-history - View audit history of moderation
exports.getModerationHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const history = await ModerationEvent.find({ listingId: id })
      .populate('moderatorId', 'name email')
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    next(error);
  }
};
