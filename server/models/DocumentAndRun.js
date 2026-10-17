const mongoose = require('mongoose');

const agentStepSubSchema = new mongoose.Schema({
  stepNumber: { type: Number, required: true },
  stepName: { type: String, required: true },
  description: { type: String },
  inputData: { type: mongoose.Schema.Types.Mixed },
  outputSummary: { type: String },
  itemsExaminedCount: { type: Number, default: 0 },
  durationMs: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['success', 'warning', 'failed'],
    default: 'success',
  },
});

const citedSourceSubSchema = new mongoose.Schema({
  sourceName: { type: String, required: true },
  sourceType: {
    type: String,
    enum: ['manufacturer_specification', 'seller_disclosure', 'missing_evidence_flag'],
    required: true,
  },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
  claimText: { type: String, required: true },
});

const documentAndRunSchema = new mongoose.Schema(
  {
    traceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    userQuery: {
      type: String,
      required: true,
      trim: true,
    },
    budgetLimit: {
      type: Number,
      default: null,
    },
    agentSteps: [agentStepSubSchema],
    citedSources: [citedSourceSubSchema],
    candidateListingIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Listing',
      },
    ],
    recommendations: [
      {
        listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
        title: String,
        price: Number,
        pros: [String],
        consAndTradeoffs: [String],
        missingGaps: [String],
      },
    ],
    suggestedPrepurchaseQuestions: [
      {
        listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
        targetSeller: String,
        question: String,
        reason: String,
      },
    ],
    executionStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed',
    },
    totalDurationMs: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('DocumentAndRun', documentAndRunSchema);
