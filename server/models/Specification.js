const mongoose = require('mongoose');

const specificationSchema = new mongoose.Schema(
  {
    brand: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    modelName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['laptops', 'cameras', 'smartphones', 'gaming', 'tablets', 'audio', 'smartwatches'],
      required: true,
    },
    officialSpecs: {
      maxRamGb: { type: Number, required: true },
      ramSlotsCount: { type: Number, default: 0 },
      ramUpgradeable: { type: Boolean, default: false },
      ramType: { type: String, default: 'Soldered LPDDR5' },
      storageSlots: { type: Number, default: 1 },
      storageUpgradeable: { type: Boolean, default: true },
      displaySpecs: {
        panelType: { type: String, default: 'IPS / OLED' },
        refreshRateHz: { type: Number, default: 60 },
        peakBrightnessNits: { type: Number, default: 400 },
        colorGamut: { type: String, default: '100% sRGB / DCI-P3' },
      },
      cpuFamily: { type: String },
      tdpWatts: { type: Number },
      powerAdapterWattage: { type: Number },
      originalMSRP: { type: Number },
      osCompatibility: { type: [String], default: [] },
      repairabilityScore: { type: Number, min: 0, max: 10 },
      knownRecallsOrAdvisories: { type: [String], default: [] },
    },
    curatedManualExcerpts: [
      {
        sectionTitle: { type: String, required: true },
        excerpt: { type: String, required: true },
        sourceDoc: { type: String, required: true },
        pageNumber: { type: Number },
      },
    ],
    embedding: {
      type: [Number],
      default: [],
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

specificationSchema.index({ brand: 1, modelName: 1 }, { unique: true });

module.exports = mongoose.model('Specification', specificationSchema);
