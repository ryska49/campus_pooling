const express = require('express');
const router = express.Router();
const {
  createRequest,
  getOpenRequests,
  getMyRequests,
  acceptRequest,
  generateOTP,
  completeDelivery,
  cancelRequest,
} = require('../controllers/requestController');
const { protect } = require('../middleware/auth');
const {
  createRequestValidator,
  completeDeliveryValidator,
  mongoIdParam,
} = require('../middleware/validators');

// All request routes require authentication
router.use(protect);

/**
 * @route   POST /api/requests
 * @desc    Create a new delivery request (deducts tokens from sender)
 * @access  Protected
 */
router.post('/', createRequestValidator, createRequest);

/**
 * @route   GET /api/requests/open
 * @desc    Get all open delivery requests (excluding own)
 * @access  Protected
 */
router.get('/open', getOpenRequests);

/**
 * @route   GET /api/requests/my
 * @desc    Get current user's requests (as sender or carrier via ?role=carrier)
 * @access  Protected
 */
router.get('/my', getMyRequests);

/**
 * @route   POST /api/requests/:id/accept
 * @desc    Accept an open delivery request (become carrier)
 * @access  Protected
 */
router.post('/:id/accept', mongoIdParam('id'), acceptRequest);

/**
 * @route   POST /api/requests/:id/generate-otp
 * @desc    Sender generates OTP for pickup verification
 * @access  Protected (sender only)
 */
router.post('/:id/generate-otp', mongoIdParam('id'), generateOTP);

/**
 * @route   POST /api/requests/:id/complete
 * @desc    Carrier submits OTP to complete delivery (transfers tokens)
 * @access  Protected (carrier only)
 */
router.post('/:id/complete', mongoIdParam('id'), completeDeliveryValidator, completeDelivery);

/**
 * @route   DELETE /api/requests/:id
 * @desc    Cancel a delivery request (refunds tokens)
 * @access  Protected (sender only)
 */
router.delete('/:id', mongoIdParam('id'), cancelRequest);

module.exports = router;
