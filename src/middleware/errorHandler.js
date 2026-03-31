import ApiError from '../utils/ApiError.js';

// User-friendly error messages
const ERROR_MESSAGES = {
  // MongoDB errors
  '11000': 'This email address is already registered. Please use a different email.',
  '11001': 'This information already exists in our system.',
  
  // Validation errors
  'ValidationError': 'Please check your input and try again.',
  'CastError': 'Invalid information provided.',
  
  // Authentication errors
  'INVALID_CREDENTIALS': 'Invalid email or password. Please try again.',
  'TOKEN_EXPIRED': 'Your session has expired. Please log in again.',
  'TOKEN_INVALID': 'Invalid authentication. Please log in again.',
  'UNAUTHORIZED': 'You need to be logged in to access this feature.',
  'FORBIDDEN': 'You do not have permission to perform this action.',
  
  // OTP errors
  'INVALID_OTP': 'The OTP you entered is incorrect. Please check and try again.',
  'OTP_EXPIRED': 'This OTP has expired. Please request a new one.',
  'OTP_NOT_FOUND': 'No OTP found. Please request a new one.',
  'OTP_ATTEMPTS_EXCEEDED': 'Too many incorrect OTP attempts. Please request a new one.',
  
  // User existence errors
  'USER_NOT_FOUND': 'Account not found. Please check your email or sign up.',
  'EMAIL_EXISTS': 'This email is already registered. Please log in or use a different email.',
  'AADHAAR_EXISTS': 'This Aadhaar number is already registered with another account.',
  'PHONE_EXISTS': 'This phone number is already registered.',
  
  // Server errors
  'SERVER_OVERLOAD': 'Our servers are experiencing high traffic. Please try again in a few minutes.',
  'DATABASE_ERROR': 'Unable to connect to our services. Please try again.',
  'NETWORK_ERROR': 'Network connection issue. Please check your internet and try again.',
  
  // File upload errors
  'FILE_TOO_LARGE': 'File size is too large. Please upload a smaller file.',
  'INVALID_FILE_TYPE': 'This file type is not supported.',
  'UPLOAD_FAILED': 'Failed to upload file. Please try again.',
  
  // Default error
  'DEFAULT': 'Something went wrong. Please try again or contact support if the problem continues.'
};

// Map error codes to user-friendly messages
const getErrorMessage = (error) => {
  // MongoDB duplicate key error
  if (error.code === 11000 || error.code === 11001) {
    const field = Object.keys(error.keyValue || {})[0];
    
    if (field === 'email') {
      return ERROR_MESSAGES.EMAIL_EXISTS;
    } else if (field === 'aadhaar') {
      return ERROR_MESSAGES.AADHAAR_EXISTS;
    } else if (field === 'phone') {
      return ERROR_MESSAGES.PHONE_EXISTS;
    }
    
    return ERROR_MESSAGES[error.code] || ERROR_MESSAGES['11000'];
  }
  
  // Mongoose validation errors
  if (error.name === 'ValidationError') {
    const firstError = Object.values(error.errors)[0];
    if (firstError) {
      if (firstError.path === 'email') {
        return 'Please enter a valid email address.';
      } else if (firstError.path === 'phone') {
        return 'Please enter a valid 10-digit phone number.';
      } else if (firstError.path === 'aadhaar') {
        return 'Please enter a valid 12-digit Aadhaar number.';
      }
      return firstError.message;
    }
    return ERROR_MESSAGES.ValidationError;
  }
  
  // Mongoose cast errors
  if (error.name === 'CastError') {
    return ERROR_MESSAGES.CastError;
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return ERROR_MESSAGES.TOKEN_INVALID;
  }
  
  if (error.name === 'TokenExpiredError') {
    return ERROR_MESSAGES.TOKEN_EXPIRED;
  }
  
  // Custom API errors
  if (error instanceof ApiError) {
    return error.message || ERROR_MESSAGES.DEFAULT;
  }
  
  // Check for specific error patterns
  const message = error.message || error.toString();
  
  if (message.includes('timeout')) {
    return ERROR_MESSAGES.SERVER_OVERLOAD;
  }
  
  if (message.includes('connection') || message.includes('ECONNREFUSED')) {
    return ERROR_MESSAGES.DATABASE_ERROR;
  }
  
  if (message.includes('OTP')) {
    if (message.includes('expired')) {
      return ERROR_MESSAGES.OTP_EXPIRED;
    }
    if (message.includes('invalid')) {
      return ERROR_MESSAGES.INVALID_OTP;
    }
    return ERROR_MESSAGES.OTP_NOT_FOUND;
  }
  
  if (message.includes('credentials') || message.includes('password')) {
    return ERROR_MESSAGES.INVALID_CREDENTIALS;
  }
  
  return ERROR_MESSAGES.DEFAULT;
};

// Get appropriate HTTP status code
const getStatusCode = (error) => {
  if (error.statusCode) return error.statusCode;
  if (error.status) return error.status;
  
  // MongoDB errors
  if (error.code === 11000 || error.code === 11001) return 409; // Conflict
  if (error.name === 'ValidationError') return 400; // Bad Request
  if (error.name === 'CastError') return 400; // Bad Request
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') return 401; // Unauthorized
  if (error.name === 'TokenExpiredError') return 401; // Unauthorized
  
  // Default
  return 500; // Internal Server Error
};

// Enhanced error handler middleware
export const errorHandler = (err, req, res, next) => {
  console.error('🔥 Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const statusCode = getStatusCode(err);
  const userMessage = getErrorMessage(err);
  
  const errorResponse = {
    statusCode,
    success: false,
    message: userMessage,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };
  
  // Add specific error details in development
  if (isDevelopment) {
    errorResponse.error = {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code
    };
  }
  
  // Add retry information for rate limiting
  if (statusCode === 429) {
    errorResponse.retryAfter = err.retryAfter || 'Please try again later';
  }
  
  // Add field information for validation errors
  if (err.name === 'ValidationError' && isDevelopment) {
    errorResponse.fields = Object.keys(err.errors || {});
  }
  
  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
