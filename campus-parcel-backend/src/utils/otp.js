const crypto = require('crypto');

const OTP_EXPIRY_MINUTES = 30;

const generateOTP = () => {
  // 6-digit numeric OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
  return { code: otp, generatedAt: now, expiresAt };
};

const isOTPExpired = (expiresAt) => {
  return new Date() > new Date(expiresAt);
};

const isOTPValid = (storedOTP, providedOTP) => {
  if (!storedOTP?.code || !providedOTP) return false;
  if (isOTPExpired(storedOTP.expiresAt)) return false;
  return storedOTP.code === providedOTP.toString();
};

module.exports = { generateOTP, isOTPExpired, isOTPValid };
