import rateLimit from 'express-rate-limit';

// General API rate limiting
export const generalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    statusCode: 429,
    success: false,
    message: "Too many requests. Please try again later.",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 auth attempts per windowMs
  message: {
    statusCode: 429,
    success: false,
    message: "Too many login attempts. Please try again later.",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP rate limiting
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 3 OTP requests per windowMs
  message: {
    statusCode: 429,
    success: false,
    message: "Too many OTP requests. Please wait before requesting another.",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Password reset rate limiting
export const passwordResetLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 5, // Limit each IP to 5 password reset requests per hour
  message: {
    statusCode: 429,
    success: false,
    message: "Too many password reset attempts. Please try again later.",
    retryAfter: "1 hour"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Delete account rate limiting (very strict)
export const deleteAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 delete requests per hour
  message: {
    statusCode: 429,
    success: false,
    message: "For security, you can only request account deletion once per hour.",
    retryAfter: "1 hour"
  },
  standardHeaders: true,
  legacyHeaders: false,
});
