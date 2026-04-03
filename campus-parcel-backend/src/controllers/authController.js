const { asyncHandler } = require('../middleware/errorHandler');
const { sendSuccess } = require('../utils/response');
const authService = require('../services/authService');

const register = asyncHandler(async (req, res) => {
  const { name, email, password, hostel } = req.body;
  const result = await authService.registerUser({ name, email, password, hostel });
  sendSuccess(res, result, 'Account created successfully.', 201);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.loginUser({ email, password });
  sendSuccess(res, result, 'Login successful.');
});

const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user._id);
  sendSuccess(res, { user }, 'User profile fetched.');
});

module.exports = { register, login, getMe };
