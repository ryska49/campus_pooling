const mongoose = require('mongoose');
const DeliveryRequest = require('../models/DeliveryRequest');
const { REQUEST_STATUS } = require('../models/DeliveryRequest');
const { deductTokens, creditTokens, refundTokens } = require('./walletService');
const { generateOTP, isOTPValid } = require('../utils/otp');
const { AppError } = require('../middleware/errorHandler');
const { emitToAll, emitToUser, EVENTS } = require('../config/socket');

const createRequest = async (senderId, requestData) => {
  const { pickupLocation, dropLocation, parcelDetails, tokenReward } = requestData;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Deduct tokens from sender upfront (escrow)
    await deductTokens(
      senderId,
      tokenReward,
      null, // requestId not yet created
      `Escrowed ${tokenReward} tokens for delivery request`,
      session
    );

    const [request] = await DeliveryRequest.create(
      [{ senderId, pickupLocation, dropLocation, parcelDetails, tokenReward }],
      { session }
    );

    // Update transaction with actual requestId
    await mongoose.model('Transaction').findOneAndUpdate(
      { userId: senderId, requestId: null },
      { requestId: request._id },
      { session, sort: { createdAt: -1 } }
    );

    await session.commitTransaction();

    // Emit real-time event to all connected clients
    emitToAll(EVENTS.NEW_REQUEST, {
      requestId: request._id,
      pickupLocation: request.pickupLocation,
      dropLocation: request.dropLocation,
      tokenReward: request.tokenReward,
      parcelDetails: request.parcelDetails,
      createdAt: request.createdAt,
    });

    return request;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const getOpenRequests = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [requests, total] = await Promise.all([
    DeliveryRequest.find({
      status: REQUEST_STATUS.OPEN,
      senderId: { $ne: userId }, // Exclude own requests
    })
      .populate('senderId', 'name hostel rating')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    DeliveryRequest.countDocuments({ status: REQUEST_STATUS.OPEN, senderId: { $ne: userId } }),
  ]);

  return { requests, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

const getMyRequests = async (userId, role = 'sender', page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const filter = role === 'carrier' ? { carrierId: userId } : { senderId: userId };

  const [requests, total] = await Promise.all([
    DeliveryRequest.find(filter)
      .populate('senderId', 'name hostel rating')
      .populate('carrierId', 'name hostel rating')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    DeliveryRequest.countDocuments(filter),
  ]);

  return { requests, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

const acceptRequest = async (requestId, carrierId) => {
  const request = await DeliveryRequest.findById(requestId);
  if (!request) throw new AppError('Delivery request not found.', 404);
  if (request.status !== REQUEST_STATUS.OPEN) throw new AppError('This request is no longer available.', 409);
  if (request.senderId.toString() === carrierId.toString()) {
    throw new AppError('You cannot carry your own parcel.', 403);
  }

  request.carrierId = carrierId;
  request.status = REQUEST_STATUS.ACCEPTED;
  request.acceptedAt = new Date();
  await request.save();

  const populated = await request.populate([
    { path: 'senderId', select: 'name hostel' },
    { path: 'carrierId', select: 'name hostel' },
  ]);

  // Notify the sender
  emitToUser(request.senderId.toString(), EVENTS.REQUEST_ACCEPTED, {
    requestId: request._id,
    carrier: { id: carrierId },
  });

  return populated;
};

const generateOTPForRequest = async (requestId, senderId) => {
  const request = await DeliveryRequest.findById(requestId);
  if (!request) throw new AppError('Delivery request not found.', 404);
  if (request.senderId.toString() !== senderId.toString()) {
    throw new AppError('Only the sender can generate an OTP.', 403);
  }
  if (request.status !== REQUEST_STATUS.ACCEPTED) {
    throw new AppError('OTP can only be generated for accepted requests.', 400);
  }

  const otpData = generateOTP();
  request.otp = otpData;
  await request.save();

  // Return OTP only to sender (never expose in socket events)
  return { otp: otpData.code, expiresAt: otpData.expiresAt };
};

const completeDelivery = async (requestId, carrierId, providedOTP) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const request = await DeliveryRequest.findById(requestId).session(session);
    if (!request) throw new AppError('Delivery request not found.', 404);
    if (request.carrierId?.toString() !== carrierId.toString()) {
      throw new AppError('Only the assigned carrier can complete this delivery.', 403);
    }
    if (request.status !== REQUEST_STATUS.ACCEPTED) {
      throw new AppError('This delivery is not in an accepted state.', 400);
    }

    if (!isOTPValid(request.otp, providedOTP)) {
      throw new AppError('Invalid or expired OTP.', 400);
    }

    // Transfer tokens to carrier
    await creditTokens(
      carrierId,
      request.tokenReward,
      requestId,
      `Earned ${request.tokenReward} tokens for delivering parcel`,
      session
    );

    request.status = REQUEST_STATUS.COMPLETED;
    request.completedAt = new Date();
    request.otp = { code: null, generatedAt: null, expiresAt: null }; // Clear OTP
    await request.save({ session });

    await session.commitTransaction();

    // Notify both parties
    emitToUser(request.senderId.toString(), EVENTS.DELIVERY_COMPLETED, { requestId });
    emitToUser(carrierId.toString(), EVENTS.DELIVERY_COMPLETED, { requestId });

    return request;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const cancelRequest = async (requestId, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const request = await DeliveryRequest.findById(requestId).session(session);
    if (!request) throw new AppError('Delivery request not found.', 404);
    if (request.senderId.toString() !== userId.toString()) {
      throw new AppError('Only the sender can cancel this request.', 403);
    }
    if ([REQUEST_STATUS.COMPLETED, REQUEST_STATUS.CANCELLED].includes(request.status)) {
      throw new AppError(`Cannot cancel a ${request.status.toLowerCase()} request.`, 400);
    }

    // Refund tokens if not yet accepted
    if (request.status === REQUEST_STATUS.OPEN || request.status === REQUEST_STATUS.ACCEPTED) {
      await refundTokens(
        userId,
        request.tokenReward,
        requestId,
        `Refund for cancelled delivery request`,
        session
      );
    }

    request.status = REQUEST_STATUS.CANCELLED;
    request.cancelledAt = new Date();
    await request.save({ session });

    await session.commitTransaction();
    return request;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  createRequest,
  getOpenRequests,
  getMyRequests,
  acceptRequest,
  generateOTPForRequest,
  completeDelivery,
  cancelRequest,
};
