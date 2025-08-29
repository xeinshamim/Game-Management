const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const tournamentController = require('../controllers/tournamentController');
const { 
  authenticateToken, 
  requireUser, 
  requireAdmin,
  generalRateLimit
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

// Tournament creation validation
const createTournamentValidation = [
  body('name')
    .isLength({ min: 3, max: 100 })
    .withMessage('Tournament name must be 3-100 characters long'),
  body('gameType')
    .isIn(['BR_MATCH', 'CLASH_SQUAD', 'LONE_WOLF', 'CS_2_VS_2'])
    .withMessage('Invalid game type'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be 1000 characters or less'),
  body('startTime')
    .isISO8601()
    .withMessage('Start time must be a valid date'),
  body('endTime')
    .isISO8601()
    .withMessage('End time must be a valid date'),
  body('registrationDeadline')
    .isISO8601()
    .withMessage('Registration deadline must be a valid date'),
  body('checkInDeadline')
    .optional()
    .isISO8601()
    .withMessage('Check-in deadline must be a valid date'),
  body('maxParticipants')
    .isInt({ min: 2, max: 100 })
    .withMessage('Max participants must be between 2 and 100'),
  body('minParticipants')
    .optional()
    .isInt({ min: 2 })
    .withMessage('Min participants must be at least 2'),
  body('entryFee')
    .isFloat({ min: 0 })
    .withMessage('Entry fee must be a non-negative number'),
  body('prizePool.first')
    .isFloat({ min: 0 })
    .withMessage('First place prize must be a non-negative number'),
  body('prizePool.second')
    .isFloat({ min: 0 })
    .withMessage('Second place prize must be a non-negative number'),
  body('prizePool.third')
    .isFloat({ min: 0 })
    .withMessage('Third place prize must be a non-negative number'),
  body('rules.maxPlayers')
    .isInt({ min: 2, max: 100 })
    .withMessage('Max players must be between 2 and 100'),
  body('rules.minPlayers')
    .optional()
    .isInt({ min: 2 })
    .withMessage('Min players must be at least 2'),
  body('rules.gameMode')
    .isIn(['single_elimination', 'double_elimination', 'round_robin', 'swiss_system', 'battle_royale'])
    .withMessage('Invalid game mode'),
  body('rules.map')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Map name must be 100 characters or less'),
  body('rules.timeLimit')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Time limit must be a positive number'),
  body('rules.customRules')
    .optional()
    .isArray()
    .withMessage('Custom rules must be an array'),
  body('rules.customRules.*')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Each custom rule must be 200 characters or less'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Each tag must be 20 characters or less'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean'),
  handleValidationErrors
];

// Tournament update validation
const updateTournamentValidation = [
  body('name')
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage('Tournament name must be 3-100 characters long'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be 1000 characters or less'),
  body('startTime')
    .optional()
    .isISO8601()
    .withMessage('Start time must be a valid date'),
  body('endTime')
    .optional()
    .isISO8601()
    .withMessage('End time must be a valid date'),
  body('registrationDeadline')
    .optional()
    .isISO8601()
    .withMessage('Registration deadline must be a valid date'),
  body('checkInDeadline')
    .optional()
    .isISO8601()
    .withMessage('Check-in deadline must be a valid date'),
  body('maxParticipants')
    .optional()
    .isInt({ min: 2, max: 100 })
    .withMessage('Max participants must be between 2 and 100'),
  body('minParticipants')
    .optional()
    .isInt({ min: 2 })
    .withMessage('Min participants must be at least 2'),
  body('entryFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Entry fee must be a non-negative number'),
  body('prizePool.first')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('First place prize must be a non-negative number'),
  body('prizePool.second')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Second place prize must be a non-negative number'),
  body('prizePool.third')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Third place prize must be a non-negative number'),
  body('rules.maxPlayers')
    .optional()
    .isInt({ min: 2, max: 100 })
    .withMessage('Max players must be between 2 and 100'),
  body('rules.minPlayers')
    .optional()
    .isInt({ min: 2 })
    .withMessage('Min players must be at least 2'),
  body('rules.gameMode')
    .optional()
    .isIn(['single_elimination', 'double_elimination', 'round_robin', 'swiss_system', 'battle_royale'])
    .withMessage('Invalid game mode'),
  body('rules.map')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Map name must be 100 characters or less'),
  body('rules.timeLimit')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Time limit must be a positive number'),
  body('rules.customRules')
    .optional()
    .isArray()
    .withMessage('Custom rules must be an array'),
  body('rules.customRules.*')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Each custom rule must be 200 characters or less'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Each tag must be 20 characters or less'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean'),
  handleValidationErrors
];

// Query parameter validation
const queryValidation = [
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
    .isIn(['upcoming', 'registration_open', 'registration_closed', 'live', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  query('gameType')
    .optional()
    .isIn(['BR_MATCH', 'CLASH_SQUAD', 'LONE_WOLF', 'CS_2_VS_2'])
    .withMessage('Invalid game type'),
  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be 1-100 characters long'),
  query('sortBy')
    .optional()
    .isIn(['startTime', 'createdAt', 'name', 'currentParticipants'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  handleValidationErrors
];

// Parameter validation
const paramValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid tournament ID'),
  param('gameType')
    .isIn(['BR_MATCH', 'CLASH_SQUAD', 'LONE_WOLF', 'CS_2_VS_2'])
    .withMessage('Invalid game type'),
  handleValidationErrors
];

// Public routes (no authentication required)
router.get('/', queryValidation, tournamentController.getTournaments);
router.get('/upcoming', queryValidation, tournamentController.getUpcomingTournaments);
router.get('/live', tournamentController.getLiveTournaments);
router.get('/game/:gameType', paramValidation, queryValidation, tournamentController.getTournamentsByGameType);
router.get('/:id', paramValidation, tournamentController.getTournamentById);

// Protected routes (authentication required)
router.post('/register/:id', 
  authenticateToken, 
  requireUser, 
  paramValidation,
  generalRateLimit,
  tournamentController.registerForTournament
);

router.delete('/unregister/:id', 
  authenticateToken, 
  requireUser, 
  paramValidation,
  generalRateLimit,
  tournamentController.unregisterFromTournament
);

// Admin/creator routes
router.post('/', 
  authenticateToken, 
  requireAdmin, 
  createTournamentValidation,
  generalRateLimit,
  tournamentController.createTournament
);

router.put('/:id', 
  authenticateToken, 
  requireUser, 
  paramValidation,
  updateTournamentValidation,
  generalRateLimit,
  tournamentController.updateTournament
);

router.delete('/:id', 
  authenticateToken, 
  requireUser, 
  paramValidation,
  generalRateLimit,
  tournamentController.deleteTournament
);

// Health check route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Tournament service is running',
    timestamp: new Date().toISOString(),
    service: 'tournament-service'
  });
});

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Tournament service error:', err);
  
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
