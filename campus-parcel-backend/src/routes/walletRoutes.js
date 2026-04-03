const express = require('express');
const router = express.Router();
const { getBalance, getTransactions } = require('../controllers/walletController');
const { protect } = require('../middleware/auth');

router.use(protect);

/**
 * @route   GET /api/wallet
 * @desc    Get current user's token balance
 * @access  Protected
 */
router.get('/', getBalance);

/**
 * @route   GET /api/wallet/transactions
 * @desc    Get paginated transaction history (?page=1&limit=20)
 * @access  Protected
 */
router.get('/transactions', getTransactions);

module.exports = router;
