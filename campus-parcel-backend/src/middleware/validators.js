const { body, param, validationResult } = require('express-validator');
const { sendError } = require('../utils/response');

// Middleware to collect and return validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));
    return sendError(res, 'Validation failed', 422, formatted);
  }
  next();
};

// ---- Auth validators ----
const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('hostel').trim().notEmpty().withMessage('Hostel name is required'),
  validate,
];

const loginValidator = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

// ---- Request validators ----
const createRequestValidator = [
  body('pickupLocation').trim().notEmpty().withMessage('Pickup location is required'),
  body('dropLocation').trim().notEmpty().withMessage('Drop location is required'),
  body('parcelDetails.description').trim().notEmpty().withMessage('Parcel description is required')
    .isLength({ max: 200 }).withMessage('Description too long'),
  body('tokenReward').isInt({ min: 1 }).withMessage('Token reward must be a positive integer'),
  validate,
];

const completeDeliveryValidator = [
  body('otp').trim().notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  validate,
];

// ---- Rating validators ----
const ratingValidator = [
  body('requestId').isMongoId().withMessage('Valid request ID is required'),
  body('score').isInt({ min: 1, max: 5 }).withMessage('Score must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 300 }).withMessage('Comment too long'),
  validate,
];

// ---- Param validators ----
const mongoIdParam = (paramName = 'id') => [
  param(paramName).isMongoId().withMessage(`Invalid ${paramName}`),
  validate,
];

module.exports = {
  registerValidator,
  loginValidator,
  createRequestValidator,
  completeDeliveryValidator,
  ratingValidator,
  mongoIdParam,
  validate,
};
