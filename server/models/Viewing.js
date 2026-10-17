const mongoose = require('mongoose');

const viewingSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    requestedDate: {
      type: Date,
      required: [true, 'Requested viewing date is required'],
    },
    timeSlot: {
      type: String,
      required: [true, 'Time slot is required'],
      trim: true,
    },
    locationType: {
      type: String,
      enum: [
        'police_station_safe_zone',
        'public_library_lobby',
        'coffee_shop_public',
        'shopping_mall_center',
      ],
      default: 'police_station_safe_zone',
    },
    locationDetails: {
      type: String,
      default: 'Official Police Department E-Commerce Safe Exchange Zone',
      trim: true,
    },
    status: {
      type: String,
      enum: ['requested', 'confirmed', 'declined', 'cancelled', 'completed'],
      default: 'requested',
      index: true,
    },
    buyerNotes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    sellerNotes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

viewingSchema.index({ listingId: 1, requestedDate: 1 });

module.exports = mongoose.model('Viewing', viewingSchema);
