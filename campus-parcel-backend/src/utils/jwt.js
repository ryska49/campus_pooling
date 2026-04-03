const jwt = require('jsonwebtoken');

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const generateUserToken = (user) => {
  return generateToken({
    id: user._id,
    email: user.email,
  });
};

module.exports = { generateToken, verifyToken, generateUserToken };
