require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { connectDB } = require('./config/db');
const logger = require('./config/logger');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
  }
});

const PORT = process.env.ANTI_CHEAT_SERVICE_PORT || 3006;

// Connect to database
connectDB();

// Socket.IO connection handling for real-time anti-cheat updates
io.on('connection', (socket) => {
  logger.info(`Client connected to anti-cheat service: ${socket.id}`);

  // Join user-specific room for real-time updates
  socket.on('join-user-room', (userId) => {
    socket.join(`user:${userId}`);
    logger.info(`Client ${socket.id} joined user room ${userId}`);
  });

  // Join match-specific room for real-time updates
  socket.on('join-match-room', (matchId) => {
    socket.join(`match:${matchId}`);
    logger.info(`Client ${socket.id} joined match room ${matchId}`);
  });

  // Join admin room for real-time updates
  socket.on('join-admin-room', () => {
    socket.join('admin');
    logger.info(`Client ${socket.id} joined admin room`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info(`Client disconnected from anti-cheat service: ${socket.id}`);
  });
});

// Make io available to routes
app.set('io', io);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Rate limiting
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  }
});

app.use(generalRateLimit);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Mount routes
app.use('/api/anti-cheat', require('./routes/antiCheat'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Anti-Cheat Service is running',
    timestamp: new Date().toISOString(),
    service: 'anti-cheat-service',
    version: '1.0.0'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  logger.info(`Anti-Cheat Service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server, io };
