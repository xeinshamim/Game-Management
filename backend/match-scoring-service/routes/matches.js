const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const matchController = require('../controllers/matchController');
const { authenticateToken, requireUser, requireAdmin } = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for match operations
const matchRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: {
    success: false,
    message: 'Too many match requests, please try again later'
  }
});

const chatRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 chat messages per minute
  message: {
    success: false,
    message: 'Too many chat messages, please slow down'
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

// Public routes (no authentication required)
router.get('/upcoming', matchController.getUpcomingMatches);
router.get('/live', matchController.getLiveMatches);

// User routes (require authentication)
router.get('/:matchId', 
  authenticateToken, 
  requireUser, 
  [
    param('matchId')
      .notEmpty()
      .withMessage('Match ID is required')
  ],
  handleValidationErrors,
  matchController.getMatch
);

router.get('/tournament/:tournamentId',
  authenticateToken,
  requireUser,
  [
    param('tournamentId')
      .isMongoId()
      .withMessage('Invalid tournament ID'),
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
      .isIn(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PAUSED'])
      .withMessage('Invalid match status')
  ],
  handleValidationErrors,
  matchController.getMatchesByTournament
);

router.post('/:matchId/join',
  authenticateToken,
  requireUser,
  matchRateLimit,
  [
    param('matchId')
      .notEmpty()
      .withMessage('Match ID is required'),
    body('teamId')
      .optional()
      .isString()
      .withMessage('Team ID must be a string')
  ],
  handleValidationErrors,
  matchController.joinMatch
);

router.post('/:matchId/leave',
  authenticateToken,
  requireUser,
  matchRateLimit,
  [
    param('matchId')
      .notEmpty()
      .withMessage('Match ID is required')
  ],
  handleValidationErrors,
  matchController.leaveMatch
);

router.post('/:matchId/chat',
  authenticateToken,
  requireUser,
  chatRateLimit,
  [
    param('matchId')
      .notEmpty()
      .withMessage('Match ID is required'),
    body('message')
      .notEmpty()
      .isLength({ min: 1, max: 500 })
      .withMessage('Message must be between 1 and 500 characters'),
    body('messageType')
      .optional()
      .isIn(['CHAT', 'SYSTEM', 'ADMIN'])
      .withMessage('Invalid message type')
  ],
  handleValidationErrors,
  matchController.addChatMessage
);

router.post('/:matchId/technical-issue',
  authenticateToken,
  requireUser,
  matchRateLimit,
  [
    param('matchId')
      .notEmpty()
      .withMessage('Match ID is required'),
    body('issueType')
      .isIn(['LAG', 'DISCONNECT', 'CRASH', 'GRAPHICAL_GLITCH', 'OTHER'])
      .withMessage('Invalid issue type'),
    body('description')
      .notEmpty()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Description must be between 10 and 1000 characters'),
    body('severity')
      .optional()
      .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
      .withMessage('Invalid severity level')
  ],
  handleValidationErrors,
  matchController.reportTechnicalIssue
);

// Admin routes (require admin authentication)
router.post('/',
  authenticateToken,
  requireAdmin,
  [
    body('tournamentId')
      .isMongoId()
      .withMessage('Invalid tournament ID'),
    body('matchNumber')
      .isInt({ min: 1 })
      .withMessage('Match number must be a positive integer'),
    body('matchType')
      .isIn(['BR_MATCH', 'CLASH_SQUAD', 'LONE_WOLF', 'CS_2VS2'])
      .withMessage('Invalid match type'),
    body('scheduledTime')
      .isISO8601()
      .withMessage('Scheduled time must be a valid ISO date'),
    body('maxParticipants')
      .isInt({ min: 2, max: 100 })
      .withMessage('Max participants must be between 2 and 100'),
    body('minParticipants')
      .isInt({ min: 2 })
      .custom((value, { req }) => {
        if (value > req.body.maxParticipants) {
          throw new Error('Min participants cannot exceed max participants');
        }
        return true;
      })
      .withMessage('Min participants must be less than or equal to max participants'),
    body('entryFee')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Entry fee must be a non-negative number'),
    body('prizePool.first')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('First prize must be a non-negative number'),
    body('prizePool.second')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Second prize must be a non-negative number'),
    body('prizePool.third')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Third prize must be a non-negative number'),
    body('matchSettings.map')
      .notEmpty()
      .withMessage('Map is required'),
    body('matchSettings.gameMode')
      .notEmpty()
      .withMessage('Game mode is required'),
    body('matchSettings.timeLimit')
      .optional()
      .isInt({ min: 5, max: 120 })
      .withMessage('Time limit must be between 5 and 120 minutes')
  ],
  handleValidationErrors,
  matchController.createMatch
);

router.put('/:matchId',
  authenticateToken,
  requireAdmin,
  [
    param('matchId')
      .notEmpty()
      .withMessage('Match ID is required')
  ],
  handleValidationErrors,
  matchController.updateMatch
);

router.post('/:matchId/start',
  authenticateToken,
  requireAdmin,
  [
    param('matchId')
      .notEmpty()
      .withMessage('Match ID is required')
  ],
  handleValidationErrors,
  matchController.startMatch
);

router.post('/:matchId/end',
  authenticateToken,
  requireAdmin,
  [
    param('matchId')
      .notEmpty()
      .withMessage('Match ID is required')
  ],
  handleValidationErrors,
  matchController.endMatch
);

router.put('/:matchId/results',
  authenticateToken,
  requireAdmin,
  [
    param('matchId')
      .notEmpty()
      .withMessage('Match ID is required'),
    body('results')
      .isArray({ min: 1 })
      .withMessage('Results must be a non-empty array'),
    body('results.*.userId')
      .isMongoId()
      .withMessage('Invalid user ID in results'),
    body('results.*.kills')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Kills must be a non-negative integer'),
    body('results.*.deaths')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Deaths must be a non-negative integer'),
    body('results.*.assists')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Assists must be a non-negative integer'),
    body('results.*.damageDealt')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Damage dealt must be a non-negative number'),
    body('results.*.damageTaken')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Damage taken must be a non-negative number'),
    body('results.*.survivalTime')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Survival time must be a non-negative integer'),
    body('results.*.bonusPoints')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Bonus points must be a non-negative number')
  ],
  handleValidationErrors,
  matchController.updateMatchResults
);

router.post('/:matchId/anti-cheat-flag',
  authenticateToken,
  requireAdmin,
  [
    param('matchId')
      .notEmpty()
      .withMessage('Match ID is required'),
    body('userId')
      .isMongoId()
      .withMessage('Invalid user ID'),
    body('flagType')
      .isIn(['SUSPICIOUS_MOVEMENT', 'UNUSUAL_ACCURACY', 'SPEED_HACK', 'AIMBOT', 'WALLHACK', 'OTHER'])
      .withMessage('Invalid flag type'),
    body('confidence')
      .isInt({ min: 0, max: 100 })
      .withMessage('Confidence must be between 0 and 100'),
    body('description')
      .notEmpty()
      .isLength({ min: 10, max: 500 })
      .withMessage('Description must be between 10 and 500 characters')
  ],
  handleValidationErrors,
  matchController.addAntiCheatFlag
);

router.get('/admin/all',
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
      .isIn(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PAUSED'])
      .withMessage('Invalid match status'),
    query('matchType')
      .optional()
      .isIn(['BR_MATCH', 'CLASH_SQUAD', 'LONE_WOLF', 'CS_2VS2'])
      .withMessage('Invalid match type'),
    query('tournamentId')
      .optional()
      .isMongoId()
      .withMessage('Invalid tournament ID')
  ],
  handleValidationErrors,
  matchController.getAllMatches
);

router.delete('/:matchId',
  authenticateToken,
  requireAdmin,
  [
    param('matchId')
      .notEmpty()
      .withMessage('Match ID is required')
  ],
  handleValidationErrors,
  matchController.deleteMatch
);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Match scoring service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
