const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const { authenticateToken, requireUser, requireAdmin } = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for payment operations
const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: 'Too many payment requests, please try again later'
  }
});

const withdrawalRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 withdrawal requests per hour
  message: {
    success: false,
    message: 'Too many withdrawal requests, please try again later'
  }
});

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User routes (require authentication)
router.get('/wallet', 
  authenticateToken, 
  requireUser, 
  paymentController.getWallet
);

router.post('/deposit',
  authenticateToken,
  requireUser,
  paymentRateLimit,
  [
    body('amount')
      .isFloat({ min: 10, max: 50000 })
      .withMessage('Amount must be between 10 and 50,000 BDT'),
    body('paymentMethod')
      .isIn(['BKASH', 'NAGAD'])
      .withMessage('Payment method must be either BKASH or NAGAD'),
    body('description')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Description must be less than 200 characters')
  ],
  handleValidationErrors,
  paymentController.processDeposit
);

router.post('/withdrawal',
  authenticateToken,
  requireUser,
  withdrawalRateLimit,
  [
    body('amount')
      .isFloat({ min: 100, max: 10000 })
      .withMessage('Withdrawal amount must be between 100 and 10,000 BDT'),
    body('paymentMethod')
      .isIn(['BKASH', 'NAGAD'])
      .withMessage('Payment method must be either BKASH or NAGAD'),
    body('description')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Description must be less than 200 characters')
  ],
  handleValidationErrors,
  paymentController.processWithdrawal
);

router.get('/transactions',
  authenticateToken,
  requireUser,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('type')
      .optional()
      .isIn(['DEPOSIT', 'WITHDRAWAL', 'PRIZE_WIN', 'TOURNAMENT_FEE', 'REFUND', 'ADMIN_ADJUSTMENT'])
      .withMessage('Invalid transaction type'),
    query('status')
      .optional()
      .isIn(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'])
      .withMessage('Invalid transaction status'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO date')
  ],
  handleValidationErrors,
  paymentController.getTransactions
);

router.get('/transactions/summary',
  authenticateToken,
  requireUser,
  [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO date')
  ],
  handleValidationErrors,
  paymentController.getTransactionSummary
);

// Admin routes (require admin authentication)
router.get('/admin/wallets',
  authenticateToken,
  requireAdmin,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('search')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Search term must be less than 100 characters'),
    query('status')
      .optional()
      .isIn(['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'])
      .withMessage('Invalid verification status')
  ],
  handleValidationErrors,
  paymentController.getAllWallets
);

router.patch('/admin/wallets/:walletId/verification',
  authenticateToken,
  requireAdmin,
  [
    param('walletId')
      .isMongoId()
      .withMessage('Invalid wallet ID'),
    body('verificationStatus')
      .isIn(['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'])
      .withMessage('Invalid verification status'),
    body('adminId')
      .isMongoId()
      .withMessage('Invalid admin ID')
  ],
  handleValidationErrors,
  paymentController.updateVerificationStatus
);

router.patch('/admin/wallets/:walletId/suspension',
  authenticateToken,
  requireAdmin,
  [
    param('walletId')
      .isMongoId()
      .withMessage('Invalid wallet ID'),
    body('isSuspended')
      .isBoolean()
      .withMessage('isSuspended must be a boolean'),
    body('suspensionReason')
      .if(body('isSuspended').equals(true))
      .notEmpty()
      .withMessage('Suspension reason is required when suspending wallet'),
    body('adminId')
      .isMongoId()
      .withMessage('Invalid admin ID')
  ],
  handleValidationErrors,
  paymentController.toggleWalletSuspension
);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Payment service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
