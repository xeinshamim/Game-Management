const Match = require('../models/Match');
const { cacheGet, cacheSet, cacheDelete } = require('../config/db');
const logger = require('../config/logger');

class MatchController {
  // Get match by ID
  async getMatch(req, res) {
    try {
      const { matchId } = req.params;
      const cacheKey = `match:${matchId}`;
      
      // Try to get from cache first
      let match = await cacheGet(cacheKey);
      
      if (!match) {
        match = await Match.findOne({ matchId })
          .populate('tournamentId', 'name type status')
          .populate('participants.userId', 'username profile.displayName profile.avatar');
        
        if (!match) {
          return res.status(404).json({
            success: false,
            message: 'Match not found'
          });
        }
        
        // Cache match data for 2 minutes
        await cacheSet(cacheKey, match, 120);
      }
      
      res.json({
        success: true,
        data: match
      });
    } catch (error) {
      logger.error('Error getting match:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get matches by tournament
  async getMatchesByTournament(req, res) {
    try {
      const { tournamentId } = req.params;
      const { status, page = 1, limit = 20 } = req.query;
      
      const cacheKey = `tournament_matches:${tournamentId}:${status}:${page}:${limit}`;
      
      // Try to get from cache first
      let matches = await cacheGet(cacheKey);
      
      if (!matches) {
        const query = { tournamentId };
        if (status) query.status = status;
        
        const skip = (page - 1) * limit;
        
        matches = await Match.find(query)
          .sort({ matchNumber: 1 })
          .skip(skip)
          .limit(parseInt(limit))
          .populate('tournamentId', 'name type');
        
        // Cache for 1 minute
        await cacheSet(cacheKey, matches, 60);
      }
      
      // Get total count
      const total = await Match.countDocuments({ tournamentId });
      
      res.json({
        success: true,
        data: {
          matches,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Error getting tournament matches:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get upcoming matches
  async getUpcomingMatches(req, res) {
    try {
      const { limit = 10 } = req.query;
      const cacheKey = `upcoming_matches:${limit}`;
      
      // Try to get from cache first
      let matches = await cacheGet(cacheKey);
      
      if (!matches) {
        matches = await Match.getUpcoming(parseInt(limit));
        
        // Cache for 30 seconds
        await cacheSet(cacheKey, matches, 30);
      }
      
      res.json({
        success: true,
        data: matches
      });
    } catch (error) {
      logger.error('Error getting upcoming matches:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get live matches
  async getLiveMatches(req, res) {
    try {
      const cacheKey = 'live_matches';
      
      // Try to get from cache first
      let matches = await cacheGet(cacheKey);
      
      if (!matches) {
        matches = await Match.getLive();
        
        // Cache for 10 seconds (live data changes frequently)
        await cacheSet(cacheKey, matches, 10);
      }
      
      res.json({
        success: true,
        data: matches
      });
    } catch (error) {
      logger.error('Error getting live matches:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Create new match
  async createMatch(req, res) {
    try {
      const {
        tournamentId,
        matchNumber,
        matchType,
        scheduledTime,
        maxParticipants,
        minParticipants,
        entryFee,
        prizePool,
        matchSettings
      } = req.body;
      
      // Check if match number already exists for this tournament
      const existingMatch = await Match.findOne({ tournamentId, matchNumber });
      if (existingMatch) {
        return res.status(400).json({
          success: false,
          message: 'Match number already exists for this tournament'
        });
      }
      
      const match = new Match({
        tournamentId,
        matchNumber,
        matchType,
        scheduledTime: new Date(scheduledTime),
        maxParticipants,
        minParticipants,
        entryFee,
        prizePool,
        matchSettings
      });
      
      await match.save();
      
      // Clear related caches
      await cacheDelete(`tournament_matches:${tournamentId}:*`);
      await cacheDelete('upcoming_matches:*');
      
      res.status(201).json({
        success: true,
        message: 'Match created successfully',
        data: match
      });
    } catch (error) {
      logger.error('Error creating match:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Update match
  async updateMatch(req, res) {
    try {
      const { matchId } = req.params;
      const updateData = req.body;
      
      const match = await Match.findOne({ matchId });
      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found'
        });
      }
      
      // Prevent updates to certain fields if match has started
      if (match.status !== 'SCHEDULED') {
        delete updateData.maxParticipants;
        delete updateData.minParticipants;
        delete updateData.scheduledTime;
        delete updateData.matchType;
      }
      
      Object.assign(match, updateData);
      await match.save();
      
      // Clear caches
      await cacheDelete(`match:${matchId}`);
      await cacheDelete(`tournament_matches:${match.tournamentId}:*`);
      await cacheDelete('upcoming_matches:*');
      await cacheDelete('live_matches');
      
      res.json({
        success: true,
        message: 'Match updated successfully',
        data: match
      });
    } catch (error) {
      logger.error('Error updating match:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Join match
  async joinMatch(req, res) {
    try {
      const { matchId } = req.params;
      const { userId } = req.user;
      const { teamId } = req.body;
      
      const match = await Match.findOne({ matchId });
      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found'
        });
      }
      
      if (match.status !== 'SCHEDULED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot join a match that has already started'
        });
      }
      
      // Get user info from auth service (in production, this would be a service call)
      const username = req.user.username;
      
      await match.addParticipant(userId, username, teamId);
      
      // Clear caches
      await cacheDelete(`match:${matchId}`);
      await cacheDelete(`tournament_matches:${match.tournamentId}:*`);
      
      res.json({
        success: true,
        message: 'Successfully joined match',
        data: {
          matchId,
          participantCount: match.participants.length
        }
      });
    } catch (error) {
      logger.error('Error joining match:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Leave match
  async leaveMatch(req, res) {
    try {
      const { matchId } = req.params;
      const { userId } = req.user;
      
      const match = await Match.findOne({ matchId });
      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found'
        });
      }
      
      if (match.status !== 'SCHEDULED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot leave a match that has already started'
        });
      }
      
      await match.removeParticipant(userId);
      
      // Clear caches
      await cacheDelete(`match:${matchId}`);
      await cacheDelete(`tournament_matches:${match.tournamentId}:*`);
      
      res.json({
        success: true,
        message: 'Successfully left match',
        data: {
          matchId,
          participantCount: match.participants.length
        }
      });
    } catch (error) {
      logger.error('Error leaving match:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Start match
  async startMatch(req, res) {
    try {
      const { matchId } = req.params;
      
      const match = await Match.findOne({ matchId });
      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found'
        });
      }
      
      await match.startMatch();
      
      // Clear caches
      await cacheDelete(`match:${matchId}`);
      await cacheDelete(`tournament_matches:${match.tournamentId}:*`);
      await cacheDelete('upcoming_matches:*');
      await cacheDelete('live_matches');
      
      res.json({
        success: true,
        message: 'Match started successfully',
        data: {
          matchId,
          status: match.status,
          startTime: match.startTime
        }
      });
    } catch (error) {
      logger.error('Error starting match:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // End match
  async endMatch(req, res) {
    try {
      const { matchId } = req.params;
      
      const match = await Match.findOne({ matchId });
      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found'
        });
      }
      
      await match.endMatch();
      
      // Clear caches
      await cacheDelete(`match:${matchId}`);
      await cacheDelete(`tournament_matches:${match.tournamentId}:*`);
      await cacheDelete('live_matches');
      
      res.json({
        success: true,
        message: 'Match ended successfully',
        data: {
          matchId,
          status: match.status,
          endTime: match.endTime,
          duration: match.duration,
          results: match.results
        }
      });
    } catch (error) {
      logger.error('Error ending match:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Update match results
  async updateMatchResults(req, res) {
    try {
      const { matchId } = req.params;
      const { results } = req.body;
      
      const match = await Match.findOne({ matchId });
      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found'
        });
      }
      
      if (match.status !== 'IN_PROGRESS') {
        return res.status(400).json({
          success: false,
          message: 'Can only update results for matches in progress'
        });
      }
      
      // Validate results structure
      if (!Array.isArray(results)) {
        return res.status(400).json({
          success: false,
          message: 'Results must be an array'
        });
      }
      
      // Update participant stats
      results.forEach(result => {
        const participant = match.participants.find(p => p.userId.toString() === result.userId);
        if (participant) {
          participant.kills = result.kills || 0;
          participant.deaths = result.deaths || 0;
          participant.assists = result.assists || 0;
          participant.damageDealt = result.damageDealt || 0;
          participant.damageTaken = result.damageTaken || 0;
          participant.survivalTime = result.survivalTime || 0;
          participant.bonusPoints = result.bonusPoints || 0;
        }
      });
      
      await match.save();
      
      // Clear caches
      await cacheDelete(`match:${matchId}`);
      await cacheDelete(`tournament_matches:${match.tournamentId}:*`);
      await cacheDelete('live_matches');
      
      res.json({
        success: true,
        message: 'Match results updated successfully',
        data: {
          matchId,
          participantCount: match.participants.length
        }
      });
    } catch (error) {
      logger.error('Error updating match results:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Add anti-cheat flag
  async addAntiCheatFlag(req, res) {
    try {
      const { matchId } = req.params;
      const { userId, flagType, confidence, description } = req.body;
      
      const match = await Match.findOne({ matchId });
      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found'
        });
      }
      
      await match.addAntiCheatFlag(userId, flagType, confidence, description);
      
      // Clear caches
      await cacheDelete(`match:${matchId}`);
      
      res.json({
        success: true,
        message: 'Anti-cheat flag added successfully',
        data: {
          matchId,
          flagCount: match.antiCheatFlags.length
        }
      });
    } catch (error) {
      logger.error('Error adding anti-cheat flag:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Add chat message
  async addChatMessage(req, res) {
    try {
      const { matchId } = req.params;
      const { userId } = req.user;
      const { message, messageType = 'CHAT' } = req.body;
      
      const match = await Match.findOne({ matchId });
      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found'
        });
      }
      
      if (match.status === 'COMPLETED' || match.status === 'CANCELLED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot add chat messages to completed or cancelled matches'
        });
      }
      
      const username = req.user.username;
      await match.addChatMessage(userId, username, message, messageType);
      
      // Clear caches
      await cacheDelete(`match:${matchId}`);
      
      res.json({
        success: true,
        message: 'Chat message added successfully',
        data: {
          matchId,
          messageCount: match.chatLog.length
        }
      });
    } catch (error) {
      logger.error('Error adding chat message:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Report technical issue
  async reportTechnicalIssue(req, res) {
    try {
      const { matchId } = req.params;
      const { userId } = req.user;
      const { issueType, description, severity = 'MEDIUM' } = req.body;
      
      const match = await Match.findOne({ matchId });
      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found'
        });
      }
      
      await match.reportTechnicalIssue(userId, issueType, description, severity);
      
      // Clear caches
      await cacheDelete(`match:${matchId}`);
      
      res.json({
        success: true,
        message: 'Technical issue reported successfully',
        data: {
          matchId,
          issueCount: match.technicalIssues.length
        }
      });
    } catch (error) {
      logger.error('Error reporting technical issue:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Admin: Get all matches
  async getAllMatches(req, res) {
    try {
      const { page = 1, limit = 20, status, matchType, tournamentId } = req.query;
      
      const query = {};
      if (status) query.status = status;
      if (matchType) query.matchType = matchType;
      if (tournamentId) query.tournamentId = tournamentId;
      
      const skip = (page - 1) * limit;
      
      const matches = await Match.find(query)
        .populate('tournamentId', 'name type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      const total = await Match.countDocuments(query);
      
      res.json({
        success: true,
        data: {
          matches,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Error getting all matches:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Admin: Delete match
  async deleteMatch(req, res) {
    try {
      const { matchId } = req.params;
      
      const match = await Match.findOne({ matchId });
      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found'
        });
      }
      
      if (match.status !== 'SCHEDULED') {
        return res.status(400).json({
          success: false,
          message: 'Can only delete scheduled matches'
        });
      }
      
      await Match.deleteOne({ matchId });
      
      // Clear caches
      await cacheDelete(`match:${matchId}`);
      await cacheDelete(`tournament_matches:${match.tournamentId}:*`);
      await cacheDelete('upcoming_matches:*');
      
      res.json({
        success: true,
        message: 'Match deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting match:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
}

module.exports = new MatchController();
