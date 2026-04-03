const { asyncHandler } = require('../middleware/errorHandler');
const { sendSuccess } = require('../utils/response');
const requestService = require('../services/requestService');

const createRequest = asyncHandler(async (req, res) => {
  const { pickupLocation, dropLocation, parcelDetails, tokenReward } = req.body;
  const request = await requestService.createRequest(req.user._id, {
    pickupLocation,
    dropLocation,
    parcelDetails,
    tokenReward: parseInt(tokenReward),
  });
  sendSuccess(res, { request }, 'Delivery request created.', 201);
});

const getOpenRequests = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const result = await requestService.getOpenRequests(
    req.user._id,
    parseInt(page),
    parseInt(limit)
  );
  sendSuccess(res, result, 'Open requests fetched.');
});

const getMyRequests = asyncHandler(async (req, res) => {
  const { role = 'sender', page = 1, limit = 20 } = req.query;
  const result = await requestService.getMyRequests(
    req.user._id,
    role,
    parseInt(page),
    parseInt(limit)
  );
  sendSuccess(res, result, 'Your requests fetched.');
});

const acceptRequest = asyncHandler(async (req, res) => {
  const request = await requestService.acceptRequest(req.params.id, req.user._id);
  sendSuccess(res, { request }, 'Request accepted. You are now the carrier.');
});

const generateOTP = asyncHandler(async (req, res) => {
  const result = await requestService.generateOTPForRequest(req.params.id, req.user._id);
  sendSuccess(res, result, 'OTP generated. Share it with the carrier upon pickup.');
});

const completeDelivery = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const request = await requestService.completeDelivery(req.params.id, req.user._id, otp);
  sendSuccess(res, { request }, 'Delivery completed! Tokens have been transferred.');
});

const cancelRequest = asyncHandler(async (req, res) => {
  const request = await requestService.cancelRequest(req.params.id, req.user._id);
  sendSuccess(res, { request }, 'Request cancelled. Tokens have been refunded.');
});

module.exports = {
  createRequest,
  getOpenRequests,
  getMyRequests,
  acceptRequest,
  generateOTP,
  completeDelivery,
  cancelRequest,
};
