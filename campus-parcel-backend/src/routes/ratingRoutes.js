const express = require('express');
const router = express.Router();
const { submitRating } = require('../controllers/ratingController');
const { protect } = require('../middleware/auth');
const { ratingValidator } = require('../middleware/validators');

router.use(protect);

/**
 * @route   POST /api/ratings
 * @desc    Sender rates the carrier after a completed delivery
 * @access  Protected (sender only)
 */
router.post('/', ratingValidator, submitRating);

module.exports = router;
