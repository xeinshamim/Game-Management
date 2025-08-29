const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const antiCheatController = require('../controllers/antiCheatController');
const { 
  authenticateToken, 
  requireUser, 
  requireAdmin, 
  antiCheatRateLimit, 
  reportRateLimit 
} = require('../middleware/authMiddleware');

const router = express.Router();

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

// Public routes (no authentication required)
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Anti-cheat service is running',
    timestamp: new Date().toISOString()
  });
});

// User routes (require authentication)
router.get('/user/:userId',
  authenticateToken,
  requireUser,
  [
    param('userId')
      .isMongoId()
      .withMessage('Invalid user ID'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],
  handleValidationErrors,
  antiCheatController.getFlagsByUser
);

router.get('/match/:matchId',
  authenticateToken,
  requireUser,
  [
    param('matchId')
      .isMongoId()
      .withMessage('Invalid match ID')
  ],
  handleValidationErrors,
  antiCheatController.getFlagsByMatch
);

// Admin routes (require admin authentication)
router.get('/',
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
    query('status')
      .optional()
      .isIn(['PENDING', 'UNDER_REVIEW', 'CONFIRMED', 'FALSE_POSITIVE', 'RESOLVED', 'ESCALATED'])
      .withMessage('Invalid status'),
    query('severity')
      .optional()
      .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
      .withMessage('Invalid severity'),
    query('cheatType')
      .optional()
      .isIn(['AIMBOT', 'WALLHACK', 'SPEED_HACK', 'ESP', 'TRIGGER_BOT', 'BUNNY_HOP', 'MACRO_USE', 'MODIFIED_CLIENT', 'INJECTED_CODE', 'MEMORY_MODIFICATION', 'NETWORK_MANIPULATION', 'UNUSUAL_ACCURACY', 'SUSPICIOUS_MOVEMENT', 'PATTERN_ANOMALY', 'OTHER'])
      .withMessage('Invalid cheat type'),
    query('detectionType')
      .optional()
      .isIn(['AUTOMATED_SCAN', 'MANUAL_REPORT', 'PATTERN_ANALYSIS', 'BEHAVIOR_ANALYSIS', 'PERFORMANCE_ANOMALY', 'NETWORK_ANALYSIS', 'FILE_INTEGRITY_CHECK', 'MEMORY_SCAN', 'PROCESS_MONITORING'])
      .withMessage('Invalid detection type')
  ],
  handleValidationErrors,
  antiCheatController.getAllFlags
);

router.get('/pending',
  authenticateToken,
  requireAdmin,
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 200 })
      .withMessage('Limit must be between 1 and 200')
  ],
  handleValidationErrors,
  antiCheatController.getPendingFlags
);

router.get('/high-severity',
  authenticateToken,
  requireAdmin,
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],
  handleValidationErrors,
  antiCheatController.getHighSeverityFlags
);

router.get('/statistics',
  authenticateToken,
  requireAdmin,
  antiCheatController.getStatistics
);

router.get('/user/:userId/risk-score',
  authenticateToken,
  requireAdmin,
  [
    param('userId')
      .isMongoId()
      .withMessage('Invalid user ID')
  ],
  handleValidationErrors,
  antiCheatController.getUserRiskScore
);

router.get('/:flagId',
  authenticateToken,
  requireAdmin,
  [
    param('flagId')
      .notEmpty()
      .withMessage('Flag ID is required')
  ],
  handleValidationErrors,
  antiCheatController.getFlagById
);

router.post('/',
  authenticateToken,
  requireAdmin,
  antiCheatRateLimit,
  [
    body('userId')
      .isMongoId()
      .withMessage('Invalid user ID'),
    body('matchId')
      .isMongoId()
      .withMessage('Invalid match ID'),
    body('tournamentId')
      .optional()
      .isMongoId()
      .withMessage('Invalid tournament ID'),
    body('detectionType')
      .isIn(['AUTOMATED_SCAN', 'MANUAL_REPORT', 'PATTERN_ANALYSIS', 'BEHAVIOR_ANALYSIS', 'PERFORMANCE_ANOMALY', 'NETWORK_ANALYSIS', 'FILE_INTEGRITY_CHECK', 'MEMORY_SCAN', 'PROCESS_MONITORING'])
      .withMessage('Invalid detection type'),
    body('cheatType')
      .isIn(['AIMBOT', 'WALLHACK', 'SPEED_HACK', 'ESP', 'TRIGGER_BOT', 'BUNNY_HOP', 'MACRO_USE', 'MODIFIED_CLIENT', 'INJECTED_CODE', 'MEMORY_MODIFICATION', 'NETWORK_MANIPULATION', 'UNUSUAL_ACCURACY', 'SUSPICIOUS_MOVEMENT', 'PATTERN_ANOMALY', 'OTHER'])
      .withMessage('Invalid cheat type'),
    body('confidence')
      .isInt({ min: 0, max: 100 })
      .withMessage('Confidence must be between 0 and 100'),
    body('description')
      .notEmpty()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Description must be between 10 and 1000 characters')
  ],
  handleValidationErrors,
  antiCheatController.createFlag
);

router.put('/:flagId/status',
  authenticateToken,
  requireAdmin,
  antiCheatRateLimit,
  [
    param('flagId')
      .notEmpty()
      .withMessage('Flag ID is required'),
    body('status')
      .isIn(['PENDING', 'UNDER_REVIEW', 'CONFIRMED', 'FALSE_POSITIVE', 'RESOLVED', 'ESCALATED'])
      .withMessage('Invalid status'),
    body('reviewNotes')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Review notes must not exceed 1000 characters'),
    body('action')
      .optional()
      .isIn(['WARNING_SENT', 'MATCH_DISQUALIFICATION', 'TOURNAMENT_BAN', 'TEMPORARY_SUSPENSION', 'PERMANENT_BAN', 'EVIDENCE_COLLECTED', 'ESCALATED_TO_ADMIN', 'NO_ACTION'])
      .withMessage('Invalid action'),
    body('actionNotes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Action notes must not exceed 500 characters'),
    body('actionDuration')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Action duration must be a positive integer')
  ],
  handleValidationErrors,
  antiCheatController.updateFlagStatus
);

router.put('/:flagId/appeal',
  authenticateToken,
  requireAdmin,
  antiCheatRateLimit,
  [
    param('flagId')
      .notEmpty()
      .withMessage('Flag ID is required'),
    body('appealStatus')
      .isIn(['APPROVED', 'REJECTED'])
      .withMessage('Invalid appeal status'),
    body('appealNotes')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Appeal notes must not exceed 1000 characters')
  ],
  handleValidationErrors,
  antiCheatController.handleAppeal
);

router.post('/bulk-action',
  authenticateToken,
  requireAdmin,
  antiCheatRateLimit,
  [
    body('flagIds')
      .isArray({ min: 1 })
      .withMessage('Flag IDs must be a non-empty array'),
    body('flagIds.*')
      .notEmpty()
      .withMessage('Flag ID cannot be empty'),
    body('action')
      .isIn(['WARNING_SENT', 'MATCH_DISQUALIFICATION', 'TOURNAMENT_BAN', 'TEMPORARY_SUSPENSION', 'PERMANENT_BAN', 'EVIDENCE_COLLECTED', 'ESCALATED_TO_ADMIN', 'NO_ACTION'])
      .withMessage('Invalid action'),
    body('actionNotes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Action notes must not exceed 500 characters'),
    body('actionDuration')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Action duration must be a positive integer')
  ],
  handleValidationErrors,
  antiCheatController.bulkAction
);

// Development/testing routes (should be disabled in production)
if (process.env.NODE_ENV === 'development') {
  router.post('/simulate-detection',
    authenticateToken,
    requireAdmin,
    reportRateLimit,
    [
      body('userId')
        .isMongoId()
        .withMessage('Invalid user ID'),
      body('matchId')
        .isMongoId()
        .withMessage('Invalid match ID'),
      body('tournamentId')
        .optional()
        .isMongoId()
        .withMessage('Invalid tournament ID'),
      body('cheatType')
        .isIn(['AIMBOT', 'WALLHACK', 'SPEED_HACK', 'ESP', 'TRIGGER_BOT', 'BUNNY_HOP', 'MACRO_USE', 'MODIFIED_CLIENT', 'INJECTED_CODE', 'MEMORY_MODIFICATION', 'NETWORK_MANIPULATION', 'UNUSUAL_ACCURACY', 'SUSPICIOUS_MOVEMENT', 'PATTERN_ANOMALY', 'OTHER'])
        .withMessage('Invalid cheat type'),
      body('confidence')
        .isInt({ min: 0, max: 100 })
        .withMessage('Confidence must be between 0 and 100'),
      body('description')
        .notEmpty()
        .isLength({ min: 10, max: 1000 })
        .withMessage('Description must be between 10 and 1000 characters')
    ],
    handleValidationErrors,
    antiCheatController.simulateDetection
  );
}

module.exports = router;
