import { body, param, query, validationResult } from 'express-validator';

// Handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => {
      switch (error.type) {
        case 'field':
          return `${error.path}: ${error.msg}`;
        default:
          return error.msg;
      }
    });
    
    return res.status(400).json({
      statusCode: 400,
      success: false,
      message: 'Validation failed',
      errors: errorMessages,
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// User registration validation
export const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 30 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'),
  
  body('role')
    .isIn(['farmer', 'buyer', 'logistics'])
    .withMessage('Role must be farmer, buyer, or logistics'),
  
  body('phone')
    .optional()
    .isMobilePhone('en-IN')
    .withMessage('Please enter a valid Indian phone number'),
  
  body('aadhaar')
    .optional()
    .isLength({ min: 12, max: 12 })
    .withMessage('Aadhaar number must be exactly 12 digits')
    .isNumeric()
    .withMessage('Aadhaar number can only contain digits'),
  
  handleValidationErrors
];

// Login validation
export const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Email validation
export const validateEmail = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  
  handleValidationErrors
];

// OTP validation
export const validateOTP = [
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .isNumeric()
    .withMessage('OTP can only contain digits'),
  
  handleValidationErrors
];

// Password reset validation
export const validatePasswordReset = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .isNumeric()
    .withMessage('OTP can only contain digits'),
  
  body('newPassword')
    .isLength({ min: 6, max: 30 })
    .withMessage('Password must be between 6 and 30 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'),
  
  handleValidationErrors
];

// Profile update validation
export const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('phone')
    .optional()
    .isMobilePhone('en-IN')
    .withMessage('Please enter a valid Indian phone number'),
  
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please enter a valid date'),
  
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters'),
  
  body('city')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('City cannot exceed 50 characters'),
  
  body('state')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('State cannot exceed 50 characters'),
  
  body('pincode')
    .optional()
    .isLength({ min: 6, max: 6 })
    .withMessage('PIN code must be exactly 6 digits')
    .isNumeric()
    .withMessage('PIN code can only contain digits'),
  
  handleValidationErrors
];

// Google auth validation
export const validateGoogleAuth = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('googleId')
    .notEmpty()
    .withMessage('Google ID is required'),
  
  body('role')
    .optional()
    .isIn(['farmer', 'buyer', 'logistics'])
    .withMessage('Role must be farmer, buyer, or logistics'),
  
  handleValidationErrors
];

// Query parameter validation
export const validateGoogleUserExists = [
  query('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address'),
  
  query('googleId')
    .notEmpty()
    .withMessage('Google ID is required'),
  
  handleValidationErrors
];

// Aadhaar validation
export const validateAadhaar = [
  body('aadhaar')
    .trim()
    .isLength({ min: 12, max: 12 })
    .withMessage('Aadhaar number must be exactly 12 digits')
    .isNumeric()
    .withMessage('Aadhaar number can only contain digits'),
  
  handleValidationErrors
];

// MongoDB ObjectId validation
export const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`),
  
  handleValidationErrors
];
