const mongoose = require('mongoose');

const shortlistSchema = new mongoose.Schema(
  {
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    targetBudget: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

shortlistSchema.index({ buyerId: 1, listingId: 1 }, { unique: true });

module.exports = mongoose.model('Shortlist', shortlistSchema);
