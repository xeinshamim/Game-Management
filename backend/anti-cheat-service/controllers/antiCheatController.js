const AntiCheatFlag = require('../models/AntiCheatFlag');
const { cacheGet, cacheSet, cacheDelete } = require('../config/db');
const logger = require('../config/logger');
const axios = require('axios');

// Get all anti-cheat flags with pagination and filters
const getAllFlags = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      severity,
      cheatType,
      userId,
      matchId,
      detectionType
    } = req.query;

    const skip = (page - 1) * limit;
    const filter = {};

    // Apply filters
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (cheatType) filter.cheatType = cheatType;
    if (userId) filter.userId = userId;
    if (matchId) filter.matchId = matchId;
    if (detectionType) filter.detectionType = detectionType;

    const flags = await AntiCheatFlag.find(filter)
      .populate('userId', 'username profile.displayName profile.avatar')
      .populate('matchId', 'matchNumber matchType')
      .populate('tournamentId', 'name type')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AntiCheatFlag.countDocuments(filter);

    res.json({
      success: true,
      data: {
        flags,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error getting all flags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve anti-cheat flags'
    });
  }
};

// Get flag by ID
const getFlagById = async (req, res) => {
  try {
    const { flagId } = req.params;

    const flag = await AntiCheatFlag.findOne({ flagId })
      .populate('userId', 'username profile.displayName profile.avatar')
      .populate('matchId', 'matchNumber matchType')
      .populate('tournamentId', 'name type')
      .populate('reviewedBy', 'username profile.displayName');

    if (!flag) {
      return res.status(404).json({
        success: false,
        message: 'Anti-cheat flag not found'
      });
    }

    res.json({
      success: true,
      data: flag
    });
  } catch (error) {
    logger.error('Error getting flag by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve anti-cheat flag'
    });
  }
};

// Create new anti-cheat flag
const createFlag = async (req, res) => {
  try {
    const {
      userId,
      matchId,
      tournamentId,
      detectionType,
      cheatType,
      confidence,
      description,
      evidence,
      context,
      metadata
    } = req.body;

    // Check if similar flag already exists for this user in this match
    const existingFlag = await AntiCheatFlag.findOne({
      userId,
      matchId,
      cheatType,
      status: { $in: ['PENDING', 'UNDER_REVIEW'] }
    });

    if (existingFlag) {
      return res.status(400).json({
        success: false,
        message: 'Similar flag already exists for this user in this match'
      });
    }

    // Create new flag
    const flag = new AntiCheatFlag({
      userId,
      matchId,
      tournamentId,
      detectionType,
      cheatType,
      confidence,
      description,
      evidence,
      context,
      metadata
    });

    await flag.save();

    // Clear cache for user and match
    await cacheDelete(`user_flags:${userId}`);
    await cacheDelete(`match_flags:${matchId}`);

    // Log the flag creation
    logger.info(`Anti-cheat flag created: ${flag.flagId} for user ${userId}`, {
      flagId: flag.flagId,
      userId,
      matchId,
      cheatType,
      severity: flag.severity,
      confidence
    });

    res.status(201).json({
      success: true,
      message: 'Anti-cheat flag created successfully',
      data: flag
    });
  } catch (error) {
    logger.error('Error creating anti-cheat flag:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create anti-cheat flag'
    });
  }
};

// Update flag status
const updateFlagStatus = async (req, res) => {
  try {
    const { flagId } = req.params;
    const { status, reviewNotes, action, actionNotes, actionDuration } = req.body;
    const adminId = req.user.userId;

    const flag = await AntiCheatFlag.findOne({ flagId });
    if (!flag) {
      return res.status(404).json({
        success: false,
        message: 'Anti-cheat flag not found'
      });
    }

    // Update status
    await flag.updateStatus(status, adminId, reviewNotes);

    // Add action if provided
    if (action) {
      await flag.addAction(action, adminId, actionNotes, actionDuration);
    }

    // Clear cache
    await cacheDelete(`user_flags:${flag.userId}`);
    await cacheDelete(`match_flags:${flag.matchId}`);

    logger.info(`Flag status updated: ${flagId} to ${status} by admin ${adminId}`);

    res.json({
      success: true,
      message: 'Flag status updated successfully',
      data: flag
    });
  } catch (error) {
    logger.error('Error updating flag status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update flag status'
    });
  }
};

// Handle appeal
const handleAppeal = async (req, res) => {
  try {
    const { flagId } = req.params;
    const { appealStatus, appealNotes } = req.body;
    const adminId = req.user.userId;

    const flag = await AntiCheatFlag.findOne({ flagId });
    if (!flag) {
      return res.status(404).json({
        success: false,
        message: 'Anti-cheat flag not found'
      });
    }

    if (!flag.appeal.isAppealed) {
      return res.status(400).json({
        success: false,
        message: 'This flag has not been appealed'
      });
    }

    await flag.reviewAppeal(appealStatus, adminId, appealNotes);

    logger.info(`Appeal handled: ${flagId} - ${appealStatus} by admin ${adminId}`);

    res.json({
      success: true,
      message: 'Appeal handled successfully',
      data: flag
    });
  } catch (error) {
    logger.error('Error handling appeal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle appeal'
    });
  }
};

// Get flags by user
const getFlagsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    // Check cache first
    const cacheKey = `user_flags:${userId}`;
    const cachedFlags = await cacheGet(cacheKey);
    
    if (cachedFlags) {
      return res.json({
        success: true,
        data: cachedFlags.slice(0, parseInt(limit)),
        fromCache: true
      });
    }

    const flags = await AntiCheatFlag.getFlagsByUser(userId, parseInt(limit));

    // Cache the result
    await cacheSet(cacheKey, flags, 300); // 5 minutes

    res.json({
      success: true,
      data: flags
    });
  } catch (error) {
    logger.error('Error getting flags by user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user flags'
    });
  }
};

// Get flags by match
const getFlagsByMatch = async (req, res) => {
  try {
    const { matchId } = req.params;

    // Check cache first
    const cacheKey = `match_flags:${matchId}`;
    const cachedFlags = await cacheGet(cacheKey);
    
    if (cachedFlags) {
      return res.json({
        success: true,
        data: cachedFlags,
        fromCache: true
      });
    }

    const flags = await AntiCheatFlag.getFlagsByMatch(matchId);

    // Cache the result
    await cacheSet(cacheKey, flags, 300); // 5 minutes

    res.json({
      success: true,
      data: flags
    });
  } catch (error) {
    logger.error('Error getting flags by match:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve match flags'
    });
  }
};

// Get pending flags
const getPendingFlags = async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const flags = await AntiCheatFlag.getPendingFlags(parseInt(limit));

    res.json({
      success: true,
      data: flags
    });
  } catch (error) {
    logger.error('Error getting pending flags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pending flags'
    });
  }
};

// Get high severity flags
const getHighSeverityFlags = async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const flags = await AntiCheatFlag.getHighSeverityFlags(parseInt(limit));

    res.json({
      success: true,
      data: flags
    });
  } catch (error) {
    logger.error('Error getting high severity flags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve high severity flags'
    });
  }
};

// Get statistics
const getStatistics = async (req, res) => {
  try {
    // Check cache first
    const cacheKey = 'anti_cheat_stats';
    const cachedStats = await cacheGet(cacheKey);
    
    if (cachedStats) {
      return res.json({
        success: true,
        data: cachedStats,
        fromCache: true
      });
    }

    const stats = await AntiCheatFlag.getStatistics();

    // Cache the result
    await cacheSet(cacheKey, stats, 600); // 10 minutes

    res.json({
      success: true,
      data: stats[0] || {}
    });
  } catch (error) {
    logger.error('Error getting statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics'
    });
  }
};

// Get user risk score
const getUserRiskScore = async (req, res) => {
  try {
    const { userId } = req.params;

    const riskScore = await AntiCheatFlag.getUserRiskScore(userId);

    res.json({
      success: true,
      data: riskScore[0] || { userId, riskScore: 0 }
    });
  } catch (error) {
    logger.error('Error getting user risk score:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user risk score'
    });
  }
};

// Automated detection simulation (for development/testing)
const simulateDetection = async (req, res) => {
  try {
    const {
      userId,
      matchId,
      tournamentId,
      cheatType,
      confidence,
      description
    } = req.body;

    // Simulate detection delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create flag
    const flag = new AntiCheatFlag({
      userId,
      matchId,
      tournamentId,
      detectionType: 'AUTOMATED_SCAN',
      cheatType,
      confidence,
      description,
      evidence: {
        metrics: {
          accuracy: Math.random() * 100,
          reactionTime: Math.random() * 500,
          movementSpeed: Math.random() * 10,
          killDistance: Math.random() * 1000,
          headshotRatio: Math.random() * 100,
          suspiciousActions: Math.floor(Math.random() * 10)
        }
      }
    });

    await flag.save();

    logger.info(`Simulated detection created: ${flag.flagId}`);

    res.json({
      success: true,
      message: 'Simulated detection created successfully',
      data: flag
    });
  } catch (error) {
    logger.error('Error creating simulated detection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create simulated detection'
    });
  }
};

// Bulk action on flags
const bulkAction = async (req, res) => {
  try {
    const { flagIds, action, actionNotes, actionDuration } = req.body;
    const adminId = req.user.userId;

    if (!flagIds || !Array.isArray(flagIds) || flagIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Flag IDs array is required'
      });
    }

    const results = [];
    for (const flagId of flagIds) {
      try {
        const flag = await AntiCheatFlag.findOne({ flagId });
        if (flag) {
          await flag.addAction(action, adminId, actionNotes, actionDuration);
          results.push({ flagId, success: true });
        } else {
          results.push({ flagId, success: false, error: 'Flag not found' });
        }
      } catch (error) {
        results.push({ flagId, success: false, error: error.message });
      }
    }

    logger.info(`Bulk action performed: ${action} on ${flagIds.length} flags by admin ${adminId}`);

    res.json({
      success: true,
      message: 'Bulk action completed',
      data: { results, totalProcessed: flagIds.length }
    });
  } catch (error) {
    logger.error('Error performing bulk action:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk action'
    });
  }
};

module.exports = {
  getAllFlags,
  getFlagById,
  createFlag,
  updateFlagStatus,
  handleAppeal,
  getFlagsByUser,
  getFlagsByMatch,
  getPendingFlags,
  getHighSeverityFlags,
  getStatistics,
  getUserRiskScore,
  simulateDetection,
  bulkAction
};
