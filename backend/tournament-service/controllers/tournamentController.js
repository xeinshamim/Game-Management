const Tournament = require('../models/Tournament');
const { cacheSet, cacheGet, cacheDelete, logger } = require('../config/db');
const axios = require('axios');

// Get all tournaments with pagination and filters
const getTournaments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      gameType,
      search,
      sortBy = 'startTime',
      sortOrder = 'asc'
    } = req.query;

    // Build filter object
    const filter = { isPublic: true };
    
    if (status) {
      filter.status = status;
    }
    
    if (gameType) {
      filter.gameType = gameType;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate skip value for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Check cache first
    const cacheKey = `tournaments:${JSON.stringify(filter)}:${page}:${limit}:${sortBy}:${sortOrder}`;
    let tournaments = await cacheGet(cacheKey);

    if (!tournaments) {
      // Get tournaments from database
      const [tournamentsData, total] = await Promise.all([
        Tournament.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .populate('participants.userId', 'username profile.avatar')
          .populate('createdBy', 'username profile.displayName')
          .lean(),
        Tournament.countDocuments(filter)
      ]);

      tournaments = {
        data: tournamentsData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      };

      // Cache for 5 minutes
      await cacheSet(cacheKey, tournaments, 300);
    }

    res.json({
      success: true,
      data: tournaments
    });

  } catch (error) {
    logger.error('Get tournaments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tournaments',
      error: 'TOURNAMENTS_FETCH_ERROR'
    });
  }
};

// Get tournament by ID
const getTournamentById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check cache first
    let tournament = await cacheGet(`tournament:${id}`);

    if (!tournament) {
      tournament = await Tournament.findById(id)
        .populate('participants.userId', 'username profile.avatar profile.displayName')
        .populate('createdBy', 'username profile.displayName profile.avatar')
        .populate('moderators', 'username profile.displayName')
        .populate('matches.participants.userId', 'username profile.avatar')
        .populate('matches.winner', 'username profile.avatar');

      if (!tournament) {
        return res.status(404).json({
          success: false,
          message: 'Tournament not found',
          error: 'TOURNAMENT_NOT_FOUND'
        });
      }

      // Cache for 2 minutes
      await cacheSet(`tournament:${id}`, tournament, 120);
    }

    res.json({
      success: true,
      data: { tournament }
    });

  } catch (error) {
    logger.error('Get tournament by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tournament',
      error: 'TOURNAMENT_FETCH_ERROR'
    });
  }
};

// Create new tournament (admin only)
const createTournament = async (req, res) => {
  try {
    const {
      name,
      gameType,
      description,
      startTime,
      endTime,
      registrationDeadline,
      checkInDeadline,
      maxParticipants,
      minParticipants,
      entryFee,
      prizePool,
      rules,
      tags,
      isPublic,
      isFeatured
    } = req.body;

    // Validate required fields
    if (!name || !gameType || !startTime || !endTime || !registrationDeadline || !maxParticipants || !entryFee || !prizePool || !rules) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Validate dates
    const now = new Date();
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    const regDeadline = new Date(registrationDeadline);

    if (startDate <= now) {
      return res.status(400).json({
        success: false,
        message: 'Start time must be in the future',
        error: 'INVALID_START_TIME'
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time',
        error: 'INVALID_END_TIME'
      });
    }

    if (regDeadline >= startDate) {
      return res.status(400).json({
        success: false,
        message: 'Registration deadline must be before start time',
        error: 'INVALID_REGISTRATION_DEADLINE'
      });
    }

    // Create tournament
    const tournament = new Tournament({
      name,
      gameType,
      description,
      startTime: startDate,
      endTime: endDate,
      registrationDeadline: regDeadline,
      checkInDeadline: checkInDeadline ? new Date(checkInDeadline) : null,
      maxParticipants: parseInt(maxParticipants),
      minParticipants: parseInt(minParticipants) || 2,
      entryFee: parseFloat(entryFee),
      prizePool: {
        first: parseFloat(prizePool.first),
        second: parseFloat(prizePool.second),
        third: parseFloat(prizePool.third)
      },
      rules: {
        maxPlayers: parseInt(rules.maxPlayers),
        minPlayers: parseInt(rules.minPlayers) || 2,
        gameMode: rules.gameMode,
        map: rules.map,
        timeLimit: rules.timeLimit ? parseInt(rules.timeLimit) : null,
        customRules: rules.customRules || [],
        allowSpectators: rules.allowSpectators !== undefined ? rules.allowSpectators : true,
        autoStart: rules.autoStart !== undefined ? rules.autoStart : false
      },
      tags: tags || [],
      isPublic: isPublic !== undefined ? isPublic : true,
      isFeatured: isFeatured !== undefined ? isFeatured : false,
      createdBy: req.user.id
    });

    await tournament.save();

    // Clear cache
    await cacheDelete('tournaments:*');

    logger.info(`Tournament created: ${tournament.name} by ${req.user.username} (${req.user.id})`);

    res.status(201).json({
      success: true,
      message: 'Tournament created successfully',
      data: { tournament }
    });

  } catch (error) {
    logger.error('Create tournament error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: 'VALIDATION_ERROR',
        details: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create tournament',
      error: 'TOURNAMENT_CREATION_ERROR'
    });
  }
};

// Update tournament (admin/creator only)
const updateTournament = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find tournament
    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found',
        error: 'TOURNAMENT_NOT_FOUND'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && tournament.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to update tournament',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Prevent updates if tournament has started
    if (tournament.status === 'live' || tournament.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update tournament that has started or completed',
        error: 'TOURNAMENT_ALREADY_STARTED'
      });
    }

    // Update tournament
    const updatedTournament = await Tournament.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('participants.userId', 'username profile.avatar');

    // Clear cache
    await cacheDelete(`tournament:${id}`);
    await cacheDelete('tournaments:*');

    logger.info(`Tournament updated: ${updatedTournament.name} by ${req.user.username} (${req.user.id})`);

    res.json({
      success: true,
      message: 'Tournament updated successfully',
      data: { tournament: updatedTournament }
    });

  } catch (error) {
    logger.error('Update tournament error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: 'VALIDATION_ERROR',
        details: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update tournament',
      error: 'TOURNAMENT_UPDATE_ERROR'
    });
  }
};

// Delete tournament (admin/creator only)
const deleteTournament = async (req, res) => {
  try {
    const { id } = req.params;

    // Find tournament
    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found',
        error: 'TOURNAMENT_NOT_FOUND'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && tournament.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to delete tournament',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Prevent deletion if tournament has participants or has started
    if (tournament.participants.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete tournament with participants',
        error: 'TOURNAMENT_HAS_PARTICIPANTS'
      });
    }

    if (tournament.status === 'live' || tournament.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete tournament that has started or completed',
        error: 'TOURNAMENT_ALREADY_STARTED'
      });
    }

    await Tournament.findByIdAndDelete(id);

    // Clear cache
    await cacheDelete(`tournament:${id}`);
    await cacheDelete('tournaments:*');

    logger.info(`Tournament deleted: ${tournament.name} by ${req.user.username} (${req.user.id})`);

    res.json({
      success: true,
      message: 'Tournament deleted successfully'
    });

  } catch (error) {
    logger.error('Delete tournament error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete tournament',
      error: 'TOURNAMENT_DELETION_ERROR'
    });
  }
};

// Register for tournament
const registerForTournament = async (req, res) => {
  try {
    const { id } = req.params;

    // Find tournament
    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found',
        error: 'TOURNAMENT_NOT_FOUND'
      });
    }

    // Check if registration is open
    if (tournament.status !== 'registration_open') {
      return res.status(400).json({
        success: false,
        message: 'Tournament registration is closed',
        error: 'REGISTRATION_CLOSED'
      });
    }

    // Check if user is already registered
    const existingParticipant = tournament.participants.find(
      p => p.userId.toString() === req.user.id
    );

    if (existingParticipant) {
      return res.status(400).json({
        success: false,
        message: 'Already registered for this tournament',
        error: 'ALREADY_REGISTERED'
      });
    }

    // Add participant
    await tournament.addParticipant(req.user.id, req.user.username);

    // Clear cache
    await cacheDelete(`tournament:${id}`);
    await cacheDelete('tournaments:*');

    logger.info(`User registered for tournament: ${req.user.username} (${req.user.id}) -> ${tournament.name}`);

    res.json({
      success: true,
      message: 'Successfully registered for tournament',
      data: { tournament }
    });

  } catch (error) {
    logger.error('Register for tournament error:', error);
    
    if (error.message === 'Tournament is full') {
      return res.status(400).json({
        success: false,
        message: 'Tournament is full',
        error: 'TOURNAMENT_FULL'
      });
    }

    if (error.message === 'Tournament registration is closed') {
      return res.status(400).json({
        success: false,
        message: 'Tournament registration is closed',
        error: 'REGISTRATION_CLOSED'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to register for tournament',
      error: 'REGISTRATION_ERROR'
    });
  }
};

// Unregister from tournament
const unregisterFromTournament = async (req, res) => {
  try {
    const { id } = req.params;

    // Find tournament
    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found',
        error: 'TOURNAMENT_NOT_FOUND'
      });
    }

    // Check if user is registered
    const participant = tournament.participants.find(
      p => p.userId.toString() === req.user.id
    );

    if (!participant) {
      return res.status(400).json({
        success: false,
        message: 'Not registered for this tournament',
        error: 'NOT_REGISTERED'
      });
    }

    // Remove participant
    await tournament.removeParticipant(req.user.id);

    // Clear cache
    await cacheDelete(`tournament:${id}`);
    await cacheDelete('tournaments:*');

    logger.info(`User unregistered from tournament: ${req.user.username} (${req.user.id}) -> ${tournament.name}`);

    res.json({
      success: true,
      message: 'Successfully unregistered from tournament',
      data: { tournament }
    });

  } catch (error) {
    logger.error('Unregister from tournament error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unregister from tournament',
      error: 'UNREGISTRATION_ERROR'
    });
  }
};

// Get upcoming tournaments
const getUpcomingTournaments = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Check cache first
    const cacheKey = `upcoming_tournaments:${limit}`;
    let tournaments = await cacheGet(cacheKey);

    if (!tournaments) {
      tournaments = await Tournament.findUpcoming(parseInt(limit));
      
      // Cache for 2 minutes
      await cacheSet(cacheKey, tournaments, 120);
    }

    res.json({
      success: true,
      data: { tournaments }
    });

  } catch (error) {
    logger.error('Get upcoming tournaments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get upcoming tournaments',
      error: 'UPCOMING_TOURNAMENTS_FETCH_ERROR'
    });
  }
};

// Get live tournaments
const getLiveTournaments = async (req, res) => {
  try {
    // Check cache first
    let tournaments = await cacheGet('live_tournaments');

    if (!tournaments) {
      tournaments = await Tournament.findLive();
      
      // Cache for 30 seconds (live data changes frequently)
      await cacheSet('live_tournaments', tournaments, 30);
    }

    res.json({
      success: true,
      data: { tournaments }
    });

  } catch (error) {
    logger.error('Get live tournaments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get live tournaments',
      error: 'LIVE_TOURNAMENTS_FETCH_ERROR'
    });
  }
};

// Get tournaments by game type
const getTournamentsByGameType = async (req, res) => {
  try {
    const { gameType } = req.params;
    const { limit = 20 } = req.query;

    // Check cache first
    const cacheKey = `tournaments_by_game:${gameType}:${limit}`;
    let tournaments = await cacheGet(cacheKey);

    if (!tournaments) {
      tournaments = await Tournament.findByGameType(gameType, parseInt(limit));
      
      // Cache for 5 minutes
      await cacheSet(cacheKey, tournaments, 300);
    }

    res.json({
      success: true,
      data: { tournaments }
    });

  } catch (error) {
    logger.error('Get tournaments by game type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tournaments by game type',
      error: 'GAME_TYPE_TOURNAMENTS_FETCH_ERROR'
    });
  }
};

module.exports = {
  getTournaments,
  getTournamentById,
  createTournament,
  updateTournament,
  deleteTournament,
  registerForTournament,
  unregisterFromTournament,
  getUpcomingTournaments,
  getLiveTournaments,
  getTournamentsByGameType
};
