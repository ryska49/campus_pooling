const mongoose = require('mongoose');

const REQUEST_STATUS = {
  OPEN: 'OPEN',
  ACCEPTED: 'ACCEPTED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

const deliveryRequestSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
      index: true,
    },
    carrierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    pickupLocation: {
      type: String,
      required: [true, 'Pickup location is required'],
      trim: true,
    },
    dropLocation: {
      type: String,
      required: [true, 'Drop location is required'],
      trim: true,
    },
    parcelDetails: {
      description: {
        type: String,
        required: [true, 'Parcel description is required'],
        trim: true,
        maxlength: [200, 'Description cannot exceed 200 characters'],
      },
      weight: {
        type: String,
        trim: true,
      },
    },
    tokenReward: {
      type: Number,
      required: [true, 'Token reward is required'],
      min: [1, 'Token reward must be at least 1'],
    },
    status: {
      type: String,
      enum: Object.values(REQUEST_STATUS),
      default: REQUEST_STATUS.OPEN,
      index: true,
    },
    otp: {
      code: { type: String, default: null },
      generatedAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
    },
    acceptedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    isRated: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for common queries
deliveryRequestSchema.index({ status: 1, createdAt: -1 });
deliveryRequestSchema.index({ senderId: 1, status: 1 });
deliveryRequestSchema.index({ carrierId: 1, status: 1 });

module.exports = mongoose.model('DeliveryRequest', deliveryRequestSchema);
module.exports.REQUEST_STATUS = REQUEST_STATUS;
