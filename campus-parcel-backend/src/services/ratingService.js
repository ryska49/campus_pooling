const mongoose = require('mongoose');
const Rating = require('../models/Rating');
const DeliveryRequest = require('../models/DeliveryRequest');
const User = require('../models/User');
const { REQUEST_STATUS } = require('../models/DeliveryRequest');
const { AppError } = require('../middleware/errorHandler');

const submitRating = async (raterId, { requestId, score, comment }) => {
  const request = await DeliveryRequest.findById(requestId);
  if (!request) throw new AppError('Delivery request not found.', 404);
  if (request.status !== REQUEST_STATUS.COMPLETED) {
    throw new AppError('You can only rate completed deliveries.', 400);
  }
  if (request.senderId.toString() !== raterId.toString()) {
    throw new AppError('Only the sender can rate this delivery.', 403);
  }
  if (request.isRated) {
    throw new AppError('This delivery has already been rated.', 409);
  }

  const rateeId = request.carrierId;
  if (!rateeId) throw new AppError('No carrier assigned to this request.', 400);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [rating] = await Rating.create(
      [{ requestId, raterId, rateeId, score, comment }],
      { session }
    );

    // Recalculate carrier's average rating
    const allRatings = await Rating.find({ rateeId }).session(session);
    const totalScore = allRatings.reduce((sum, r) => sum + r.score, 0);
    const avgScore = parseFloat((totalScore / allRatings.length).toFixed(2));

    await User.findByIdAndUpdate(
      rateeId,
      { 'rating.average': avgScore, 'rating.count': allRatings.length },
      { session }
    );

    await DeliveryRequest.findByIdAndUpdate(requestId, { isRated: true }, { session });

    await session.commitTransaction();
    return rating;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = { submitRating };
