const mongoose = require('mongoose');

const TRANSACTION_TYPES = {
  EARNED: 'EARNED',
  SPENT: 'SPENT',
  REFUND: 'REFUND',
};

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryRequest',
      required: [true, 'Request ID is required'],
    },
    type: {
      type: String,
      enum: Object.values(TRANSACTION_TYPES),
      required: [true, 'Transaction type is required'],
    },
    tokens: {
      type: Number,
      required: [true, 'Token amount is required'],
      min: [1, 'Token amount must be positive'],
    },
    description: {
      type: String,
      trim: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
module.exports.TRANSACTION_TYPES = TRANSACTION_TYPES;
