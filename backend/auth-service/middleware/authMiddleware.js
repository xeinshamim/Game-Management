const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { cacheGet, cacheDelete, logger } = require('../config/db');

// JWT verification middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
        error: 'MISSING_TOKEN'
      });
    }

    // Check if token is blacklisted (logged out)
    const isBlacklisted = await cacheGet(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Token is invalid or expired',
        error: 'INVALID_TOKEN'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from cache first, then database
    let user = await cacheGet(`user:${decoded.userId}`);
    
    if (!user) {
      user = await User.findById(decoded.userId).select('-password');
      if (user) {
        // Cache user for 1 hour
        await cacheGet(`user:${decoded.userId}`, user, 3600);
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated',
        error: 'ACCOUNT_DEACTIVATED'
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: 'Account is banned',
        error: 'ACCOUNT_BANNED',
        banReason: user.banReason
      });
    }

    // Add user to request object
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        error: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        error: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: 'AUTH_ERROR'
    });
  }
};

// Role-based access control middleware
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'AUTHENTICATION_REQUIRED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
};

// Admin only middleware
const requireAdmin = authorizeRoles('admin');

// Moderator or Admin middleware
const requireModerator = authorizeRoles('admin', 'moderator');

// User or higher middleware
const requireUser = authorizeRoles('user', 'moderator', 'admin');

// Optional authentication middleware (for guest access)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive && !user.isBanned) {
        req.user = user;
        req.token = token;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional routes
    next();
  }
};

// Rate limiting middleware
const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests') => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      error: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use IP address or user ID if authenticated
      return req.user ? req.user.id : req.ip;
    },
    skip: (req) => {
      // Skip rate limiting for admin users
      return req.user && req.user.role === 'admin';
    }
  });
};

// Specific rate limiters
const authRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts. Please try again later.'
);

const generalRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests
  'Too many requests. Please try again later.'
);

// Logout middleware (blacklist token)
const logout = async (req, res, next) => {
  try {
    if (req.token) {
      // Blacklist the token for 24 hours (JWT expiration time)
      await cacheDelete(`blacklist:${req.token}`);
      await cacheDelete(`blacklist:${req.token}`, true, 24 * 60 * 60);
    }
    next();
  } catch (error) {
    logger.error('Logout error:', error);
    next();
  }
};

// Update last login middleware
const updateLastLogin = async (req, res, next) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user.id, { lastLogin: new Date() });
    }
    next();
  } catch (error) {
    logger.error('Update last login error:', error);
    next();
  }
};

// Validate user session middleware
const validateSession = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    // Check if user is still active in database
    const currentUser = await User.findById(req.user.id).select('isActive isBanned');
    
    if (!currentUser || !currentUser.isActive || currentUser.isBanned) {
      // Clear user session
      req.user = null;
      req.token = null;
      
      return res.status(401).json({
        success: false,
        message: 'Session expired or invalid',
        error: 'SESSION_EXPIRED'
      });
    }

    next();
  } catch (error) {
    logger.error('Session validation error:', error);
    next();
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  requireAdmin,
  requireModerator,
  requireUser,
  optionalAuth,
  createRateLimiter,
  authRateLimit,
  generalRateLimit,
  logout,
  updateLastLogin,
  validateSession
};
