const mongoose = require('mongoose');

const moderationEventSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
    moderatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    action: {
      type: String,
      enum: [
        'approved',
        'flagged',
        'suspended',
        'reinstated',
        'evidence_verified',
        'evidence_rejected',
        'inconsistency_noted',
        'report_filed',
      ],
      required: [true, 'Moderation action is required'],
    },
    reason: {
      type: String,
      required: [true, 'Moderation reason must be stated'],
      trim: true,
    },
    previousStatus: {
      type: String,
      required: true,
    },
    newStatus: {
      type: String,
      required: true,
    },
    evidenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PrivateEvidence',
      default: null,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

moderationEventSchema.index({ listingId: 1, createdAt: -1 });

module.exports = mongoose.model('ModerationEvent', moderationEventSchema);
