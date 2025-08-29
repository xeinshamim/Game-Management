const express = require('express');
const { body, param, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const { 
  authenticateToken, 
  requireUser, 
  requireAdmin,
  authRateLimit,
  generalRateLimit,
  updateLastLogin,
  validateSession
} = require('../middleware/authMiddleware');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }
  next();
};

// Registration validation
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters long and contain only letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('phone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Phone number must be valid'),
  body('displayName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Display name must be 50 characters or less'),
  body('country')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Country must be 100 characters or less'),
  handleValidationErrors
];

// Login validation
const loginValidation = [
  body('identifier')
    .notEmpty()
    .withMessage('Username or email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Admin login validation
const adminLoginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Profile update validation
const profileUpdateValidation = [
  body('displayName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Display name must be 1-50 characters long'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio must be 500 characters or less'),
  body('country')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Country must be 100 characters or less'),
  body('timezone')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Timezone must be 50 characters or less'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),
  handleValidationErrors
];

// Password change validation
const passwordChangeValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  handleValidationErrors
];

// Username check validation
const usernameCheckValidation = [
  param('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters long and contain only letters, numbers, and underscores'),
  handleValidationErrors
];

// Email check validation
const emailCheckValidation = [
  param('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  handleValidationErrors
];

// Public routes (no authentication required)
router.post('/register', authRateLimit, registerValidation, authController.register);
router.post('/login', authRateLimit, loginValidation, authController.login);
router.post('/admin/login', authRateLimit, adminLoginValidation, authController.adminLogin);
router.get('/username/:username/check', usernameCheckValidation, authController.checkUsername);
router.get('/email/:email/check', emailCheckValidation, authController.checkEmail);

// Protected routes (authentication required)
router.get('/profile', 
  authenticateToken, 
  validateSession, 
  updateLastLogin, 
  authController.getProfile
);

router.put('/profile', 
  authenticateToken, 
  validateSession, 
  updateLastLogin, 
  profileUpdateValidation, 
  authController.updateProfile
);

router.put('/password', 
  authenticateToken, 
  validateSession, 
  updateLastLogin, 
  passwordChangeValidation, 
  authController.changePassword
);

router.post('/logout', 
  authenticateToken, 
  validateSession, 
  authController.logout
);

router.post('/refresh', 
  authenticateToken, 
  validateSession, 
  authController.refreshToken
);

// Health check route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Auth service is running',
    timestamp: new Date().toISOString(),
    service: 'auth-service'
  });
});

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Auth service error:', err);
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: 'INTERNAL_ERROR'
  });
});

// 404 handler
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    error: 'ROUTE_NOT_FOUND'
  });
});

module.exports = router;
