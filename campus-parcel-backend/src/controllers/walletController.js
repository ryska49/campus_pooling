const { asyncHandler } = require('../middleware/errorHandler');
const { sendSuccess } = require('../utils/response');
const walletService = require('../services/walletService');

const getBalance = asyncHandler(async (req, res) => {
  const result = await walletService.getWalletBalance(req.user._id);
  sendSuccess(res, result, 'Wallet balance fetched.');
});

const getTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const result = await walletService.getTransactionHistory(
    req.user._id,
    parseInt(page),
    parseInt(limit)
  );
  sendSuccess(res, result, 'Transaction history fetched.');
});

module.exports = { getBalance, getTransactions };
