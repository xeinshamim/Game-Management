const jwt = require('jsonwebtoken');
const { cacheGet, cacheDelete } = require('../config/db');
const logger = require('../config/logger');

// JWT token authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Check if token is blacklisted
    const isBlacklisted = await cacheGet(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists in cache
    const user = await cacheGet(`user:${decoded.userId}`);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Token authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Role-based authorization middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Require admin role
const requireAdmin = authorizeRoles('admin', 'super_admin');

// Require user role
const requireUser = authorizeRoles('user', 'admin', 'super_admin');

// Rate limiting middleware
const rateLimit = require('express-rate-limit');

const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Specific rate limits for anti-cheat operations
const antiCheatRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  20, // 20 requests per 15 minutes
  'Too many anti-cheat requests, please try again later'
);

const reportRateLimit = createRateLimit(
  1 * 60 * 1000, // 1 minute
  5, // 5 reports per minute
  'Too many reports, please slow down'
);

// Token blacklisting for logout
const blacklistToken = async (req, res, next) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (token) {
      // Blacklist token with expiration (24 hours)
      await cacheDelete(`blacklist:${token}`);
      logger.info(`Token blacklisted for user: ${req.user.userId}`);
    }
    next();
  } catch (error) {
    logger.error('Token blacklisting error:', error);
    next();
  }
};

// Session validation middleware
const validateSession = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User session not found'
      });
    }

    // Check if user session is still valid
    const sessionKey = `session:${req.user.userId}`;
    const session = await cacheGet(sessionKey);
    
    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Session expired'
      });
    }

    // Update session last activity
    req.user.lastActivity = new Date();
    next();
  } catch (error) {
    logger.error('Session validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Session validation failed'
    });
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  requireAdmin,
  requireUser,
  antiCheatRateLimit,
  reportRateLimit,
  blacklistToken,
  validateSession
};
