const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { TRANSACTION_TYPES } = require('../models/Transaction');
const { AppError } = require('../middleware/errorHandler');

/**
 * Deduct tokens from user (when creating a request).
 * Called inside a Mongoose session for atomicity.
 */
const deductTokens = async (userId, amount, requestId, description, session) => {
  const user = await User.findById(userId).session(session);
  if (!user) throw new AppError('User not found.', 404);

  if (user.tokenBalance < amount) {
    throw new AppError(`Insufficient token balance. You need ${amount} tokens but have ${user.tokenBalance}.`, 400);
  }

  user.tokenBalance -= amount;
  await user.save({ session });

  const tx = await Transaction.create(
    [
      {
        userId,
        requestId,
        type: TRANSACTION_TYPES.SPENT,
        tokens: amount,
        description: description || `Spent ${amount} tokens for delivery request`,
        balanceAfter: user.tokenBalance,
      },
    ],
    { session }
  );

  return { newBalance: user.tokenBalance, transaction: tx[0] };
};

/**
 * Credit tokens to user (when delivery is completed).
 */
const creditTokens = async (userId, amount, requestId, description, session) => {
  const user = await User.findById(userId).session(session);
  if (!user) throw new AppError('User not found.', 404);

  user.tokenBalance += amount;
  await user.save({ session });

  const tx = await Transaction.create(
    [
      {
        userId,
        requestId,
        type: TRANSACTION_TYPES.EARNED,
        tokens: amount,
        description: description || `Earned ${amount} tokens for delivery`,
        balanceAfter: user.tokenBalance,
      },
    ],
    { session }
  );

  return { newBalance: user.tokenBalance, transaction: tx[0] };
};

/**
 * Refund tokens to sender (when request is cancelled after acceptance).
 */
const refundTokens = async (userId, amount, requestId, description, session) => {
  const user = await User.findById(userId).session(session);
  if (!user) throw new AppError('User not found.', 404);

  user.tokenBalance += amount;
  await user.save({ session });

  const tx = await Transaction.create(
    [
      {
        userId,
        requestId,
        type: TRANSACTION_TYPES.REFUND,
        tokens: amount,
        description: description || `Refund of ${amount} tokens`,
        balanceAfter: user.tokenBalance,
      },
    ],
    { session }
  );

  return { newBalance: user.tokenBalance, transaction: tx[0] };
};

const getWalletBalance = async (userId) => {
  const user = await User.findById(userId).select('tokenBalance name');
  if (!user) throw new AppError('User not found.', 404);
  return { tokenBalance: user.tokenBalance };
};

const getTransactionHistory = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [transactions, total] = await Promise.all([
    Transaction.find({ userId })
      .populate('requestId', 'pickupLocation dropLocation')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments({ userId }),
  ]);

  return {
    transactions,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

module.exports = { deductTokens, creditTokens, refundTokens, getWalletBalance, getTransactionHistory };
