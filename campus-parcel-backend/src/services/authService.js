const User = require('../models/User');
const { generateUserToken } = require('../utils/jwt');
const { AppError } = require('../middleware/errorHandler');

const registerUser = async ({ name, email, password, hostel }) => {
  // Check for duplicate email
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('An account with this email already exists.', 409);
  }

  const user = await User.create({ name, email, password, hostel });
  const token = generateUserToken(user);

  return { user: user.toPublicJSON(), token };
};

const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new AppError('Invalid email or password.', 401);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid email or password.', 401);
  }

  if (!user.isActive) {
    throw new AppError('Your account has been deactivated.', 403);
  }

  const token = generateUserToken(user);

  // Remove password from returned object
  const userObj = user.toPublicJSON();

  return { user: userObj, token };
};

const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404);
  return user.toPublicJSON();
};

module.exports = { registerUser, loginUser, getMe };
