const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Listing title is required'],
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['laptops', 'cameras', 'gaming'],
      required: [true, 'Category is required'],
      index: true,
    },
    brand: {
      type: String,
      required: [true, 'Brand is required'],
      trim: true,
      index: true,
    },
    modelName: {
      type: String,
      required: [true, 'Model name is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 1,
      index: true,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    condition: {
      type: String,
      enum: ['new', 'open_box', 'excellent', 'good', 'fair'],
      required: [true, 'Condition grade is required'],
    },
    // Structured specifications provided by seller
    structuredSpecs: {
      cpu: { type: String, trim: true },
      ramGb: { type: Number },
      ramType: { type: String, trim: true },
      storageGb: { type: Number },
      storageType: { type: String, default: 'NVMe SSD' },
      gpu: { type: String, trim: true },
      screenSizeInches: { type: Number },
      resolution: { type: String, trim: true },
      batteryCapacityWh: { type: Number },
      releaseYear: { type: Number },
      // Camera specific
      sensorType: { type: String, trim: true },
      megapixels: { type: Number },
      lensMount: { type: String, trim: true },
      shutterCount: { type: Number },
      // Gaming specific
      dockIncluded: { type: Boolean, default: false },
    },
    // Condition Disclosures declared by seller
    conditionDisclosures: {
      batteryHealthPct: { type: Number, default: null },
      batteryCycleCount: { type: Number, default: null },
      screenCondition: { type: String, trim: true, default: 'Flawless' },
      bodyCondition: { type: String, trim: true, default: 'Minor wear' },
      functionalDefects: { type: [String], default: [] },
      repairHistory: { type: String, default: 'No known prior repairs' },
      originalAccessories: { type: [String], default: [] },
      sellerConditionSummary: { type: String, trim: true },
    },
    // Flagged missing disclosures (e.g. if battery health is omitted)
    missingDisclosures: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'sold'],
      default: 'pending',
      index: true,
    },
    evidenceStatus: {
      type: String,
      enum: ['none', 'pending', 'verified', 'flagged', 'rejected'],
      default: 'none',
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    images: {
      type: [String],
      default: [],
    },
    // 1536-dim or 384-dim normalized vector embedding for Atlas Vector Search
    embedding: {
      type: [Number],
      default: [],
      select: false,
    },
    reportCount: {
      type: Number,
      default: 0,
    },
    moderationNote: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for performant public queries and hard budget filtering
listingSchema.index({ status: 1, category: 1, price: 1 });
listingSchema.index({ status: 1, brand: 1, price: 1 });

// Helper to determine missing fields before saving
listingSchema.pre('save', function (next) {
  const missing = [];
  if (this.category === 'laptops') {
    if (this.conditionDisclosures.batteryHealthPct === null || this.conditionDisclosures.batteryHealthPct === undefined) {
      missing.push('Battery Health % not disclosed');
    }
    if (this.conditionDisclosures.batteryCycleCount === null || this.conditionDisclosures.batteryCycleCount === undefined) {
      missing.push('Battery Cycle Count not disclosed');
    }
  } else if (this.category === 'cameras') {
    if (!this.structuredSpecs.shutterCount) {
      missing.push('Shutter actuation count not disclosed');
    }
  }
  this.missingDisclosures = missing;
  next();
});

module.exports = mongoose.model('Listing', listingSchema);
