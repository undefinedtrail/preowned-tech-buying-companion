const mongoose = require('mongoose');

const privateEvidenceSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      unique: true,
      index: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    serialNumber: {
      type: String,
      required: [true, 'Serial number is required for evidence verification'],
      trim: true,
    },
    proofOfOwnershipDocUrl: {
      type: String,
      trim: true,
    },
    purchaseReceiptUrl: {
      type: String,
      trim: true,
    },
    batteryReportDocUrl: {
      type: String,
      trim: true,
    },
    diagnosticLogs: {
      type: String,
      trim: true,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'flagged', 'rejected'],
      default: 'pending',
    },
    moderatorNotes: {
      type: String,
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Strict Security Helper:
 * Masks serial numbers and redacts private invoices for public or AI consumers.
 * Format: "SN-****-9821"
 */
privateEvidenceSchema.methods.toMaskedJSON = function () {
  let maskedSerial = 'SN-****';
  if (this.serialNumber) {
    const len = this.serialNumber.length;
    if (len >= 8) {
      const visiblePrefix = this.serialNumber.slice(0, 2);
      const visibleSuffix = this.serialNumber.slice(-2);
      maskedSerial = `${visiblePrefix}-****-${visibleSuffix}`;
    } else if (len >= 5) {
      const visiblePrefix = this.serialNumber.slice(0, 1);
      const visibleSuffix = this.serialNumber.slice(-1);
      maskedSerial = `${visiblePrefix}-****-${visibleSuffix}`;
    } else {
      maskedSerial = 'SN-****';
    }
  }

  return {
    id: this._id,
    listingId: this.listingId,
    maskedSerialNumber: maskedSerial,
    verificationStatus: this.verificationStatus,
    hasProofOfOwnership: Boolean(this.proofOfOwnershipDocUrl),
    hasPurchaseReceipt: Boolean(this.purchaseReceiptUrl),
    hasBatteryReport: Boolean(this.batteryReportDocUrl),
    diagnosticSummary: this.diagnosticLogs
      ? 'Diagnostic log submitted and reviewed'
      : 'No diagnostic log attached',
    verifiedAt: this.verifiedAt,
    moderatorNotes: this.verificationStatus === 'verified' ? 'Verified by staff' : null,
  };
};

module.exports = mongoose.model('PrivateEvidence', privateEvidenceSchema);
