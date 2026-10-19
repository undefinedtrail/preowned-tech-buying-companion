const mongoose = require('mongoose');

const messageSubSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  senderRole: {
    type: String,
    enum: ['buyer', 'seller', 'moderator'],
    required: true,
  },
  message: {
    type: String,
    required: [true, 'Message text cannot be empty'],
    trim: true,
    maxlength: 2000,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const questionSchema = new mongoose.Schema(
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
    subject: {
      type: String,
      trim: true,
      default: 'Pre-purchase Inquiry',
    },
    messages: [messageSubSchema],
    isPrivateThread: {
      type: Boolean,
      default: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

questionSchema.index({ listingId: 1, buyerId: 1 }, { unique: true });

module.exports = mongoose.model('Question', questionSchema);
