const { asyncHandler } = require('../middleware/errorHandler');
const { sendSuccess } = require('../utils/response');
const ratingService = require('../services/ratingService');

const submitRating = asyncHandler(async (req, res) => {
  const { requestId, score, comment } = req.body;
  const rating = await ratingService.submitRating(req.user._id, {
    requestId,
    score: parseInt(score),
    comment,
  });
  sendSuccess(res, { rating }, 'Rating submitted successfully.', 201);
});

module.exports = { submitRating };
