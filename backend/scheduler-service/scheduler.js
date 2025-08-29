require('dotenv').config();
const cron = require('node-cron');
const axios = require('axios');
const winston = require('winston');
const mongoose = require('mongoose');
const redis = require('redis');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'scheduler-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Configuration
const config = {
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  tournamentServiceUrl: process.env.TOURNAMENT_SERVICE_URL || 'http://localhost:3002',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/gaming_tournament',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  tournamentInterval: parseInt(process.env.AUTOMATED_TOURNAMENT_INTERVAL) || 30, // minutes
  systemUserEmail: 'system@gamingtournament.com',
  systemUserPassword: 'admin123' // This should be changed in production
};

// Game types for automated tournaments
const gameTypes = ['BR_MATCH', 'CLASH_SQUAD', 'LONE_WOLF', 'CS_2_VS_2'];

// Tournament templates for each game type
const tournamentTemplates = {
  BR_MATCH: {
    name: 'BR Match Tournament',
    description: 'Automated Battle Royale tournament',
    maxParticipants: 50,
    minParticipants: 10,
    entryFee: 50,
    prizePool: { first: 1500, second: 750, third: 250 },
    rules: {
      maxPlayers: 50,
      minPlayers: 10,
      gameMode: 'battle_royale',
      map: 'Erangel',
      timeLimit: 30,
      customRules: ['Last player standing wins', 'No teaming allowed'],
      allowSpectators: true,
      autoStart: true
    }
  },
  CLASH_SQUAD: {
    name: 'Clash Squad Tournament',
    description: 'Automated squad-based tournament',
    maxParticipants: 32,
    minParticipants: 8,
    entryFee: 75,
    prizePool: { first: 2000, second: 1000, third: 500 },
    rules: {
      maxPlayers: 32,
      minPlayers: 8,
      gameMode: 'single_elimination',
      map: 'Miramar',
      timeLimit: 45,
      customRules: ['4-player squads', 'Best of 3 matches'],
      allowSpectators: true,
      autoStart: true
    }
  },
  LONE_WOLF: {
    name: 'Lone Wolf Tournament',
    description: 'Automated solo player tournament',
    maxParticipants: 64,
    minParticipants: 16,
    entryFee: 100,
    prizePool: { first: 3000, second: 1500, third: 750 },
    rules: {
      maxPlayers: 64,
      minPlayers: 16,
      gameMode: 'single_elimination',
      map: 'Sanhok',
      timeLimit: 60,
      customRules: ['Solo players only', 'No teaming'],
      allowSpectators: true,
      autoStart: true
    }
  },
  CS_2_VS_2: {
    name: 'CS 2 vs 2 Tournament',
    description: 'Automated Counter-Strike 2v2 tournament',
    maxParticipants: 16,
    minParticipants: 4,
    entryFee: 125,
    prizePool: { first: 2500, second: 1250, third: 625 },
    rules: {
      maxPlayers: 16,
      minPlayers: 4,
      gameMode: 'single_elimination',
      map: 'de_dust2',
      timeLimit: 90,
      customRules: ['2v2 format', 'Best of 5 rounds'],
      allowSpectators: true,
      autoStart: true
    }
  }
};

// Global variables
let authToken = null;
let redisClient = null;

// Initialize MongoDB connection
const connectMongoDB = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Initialize Redis connection
const connectRedis = async () => {
  try {
    redisClient = redis.createClient({ url: config.redisUrl });
    await redisClient.connect();
    logger.info('Redis connected successfully');
  } catch (error) {
    logger.error('Redis connection failed:', error);
    // Continue without Redis for now
  }
};

// Get authentication token for system user
const getAuthToken = async () => {
  try {
    const response = await axios.post(`${config.authServiceUrl}/api/auth/login`, {
      identifier: config.systemUserEmail,
      password: config.systemUserPassword
    });

    if (response.data.success) {
      authToken = response.data.data.token;
      logger.info('Authentication token obtained successfully');
      return authToken;
    } else {
      throw new Error('Failed to get authentication token');
    }
  } catch (error) {
    logger.error('Authentication failed:', error.message);
    throw error;
  }
};

// Create automated tournament
const createAutomatedTournament = async (gameType) => {
  try {
    if (!authToken) {
      await getAuthToken();
    }

    const template = tournamentTemplates[gameType];
    if (!template) {
      throw new Error(`No template found for game type: ${gameType}`);
    }

    // Calculate tournament timing
    const now = new Date();
    const startTime = new Date(now.getTime() + (config.tournamentInterval * 60 * 1000));
    const endTime = new Date(startTime.getTime() + (2 * 60 * 60 * 1000)); // 2 hours duration
    const registrationDeadline = new Date(startTime.getTime() - (15 * 60 * 1000)); // 15 minutes before start

    const tournamentData = {
      ...template,
      gameType,
      type: 'automated',
      status: 'upcoming',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      registrationDeadline: registrationDeadline.toISOString(),
      checkInDeadline: new Date(startTime.getTime() - (5 * 60 * 1000)).toISOString(), // 5 minutes before start
      tags: ['automated', gameType.toLowerCase()],
      isPublic: true,
      isFeatured: false
    };

    const response = await axios.post(
      `${config.tournamentServiceUrl}/api/tournaments`,
      tournamentData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.success) {
      logger.info(`Automated tournament created successfully: ${tournamentData.name} (${gameType})`);
      
      // Cache the tournament creation
      if (redisClient) {
        await redisClient.setEx(
          `automated_tournament:${gameType}:${startTime.getTime()}`,
          3600,
          JSON.stringify(response.data.data.tournament)
        );
      }
      
      return response.data.data.tournament;
    } else {
      throw new Error(`Failed to create tournament: ${response.data.message}`);
    }
  } catch (error) {
    logger.error(`Failed to create automated tournament for ${gameType}:`, error.message);
    
    // If authentication failed, try to get a new token
    if (error.response?.status === 401) {
      authToken = null;
      logger.info('Authentication token expired, will retry on next iteration');
    }
    
    throw error;
  }
};

// Schedule automated tournaments
const scheduleAutomatedTournaments = async () => {
  try {
    logger.info('Starting automated tournament creation...');
    
    const promises = gameTypes.map(async (gameType) => {
      try {
        await createAutomatedTournament(gameType);
        return { gameType, success: true };
      } catch (error) {
        return { gameType, success: false, error: error.message };
      }
    });

    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;
    
    logger.info(`Automated tournament creation completed: ${successful} successful, ${failed} failed`);
    
    // Log detailed results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { gameType, success, error } = result.value;
        if (success) {
          logger.info(`✓ ${gameType}: Created successfully`);
        } else {
          logger.error(`✗ ${gameType}: Failed - ${error}`);
        }
      } else {
        logger.error(`✗ ${gameTypes[index]}: Promise rejected - ${result.reason}`);
      }
    });

  } catch (error) {
    logger.error('Error in automated tournament scheduling:', error);
  }
};

// Check and update tournament statuses
const updateTournamentStatuses = async () => {
  try {
    if (!authToken) {
      await getAuthToken();
    }

    // Get tournaments that need status updates
    const response = await axios.get(
      `${config.tournamentServiceUrl}/api/tournaments?status=upcoming&limit=100`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.success) {
      const tournaments = response.data.data.data;
      const now = new Date();
      
      for (const tournament of tournaments) {
        try {
          const startTime = new Date(tournament.startTime);
          const registrationDeadline = new Date(tournament.registrationDeadline);
          
          let statusUpdate = null;
          
          // Check if registration should be closed
          if (tournament.status === 'upcoming' && now >= registrationDeadline) {
            statusUpdate = 'registration_closed';
          }
          
          // Check if tournament should start
          if (tournament.status === 'registration_closed' && now >= startTime) {
            statusUpdate = 'live';
          }
          
          if (statusUpdate) {
            await axios.put(
              `${config.tournamentServiceUrl}/api/tournaments/${tournament.id}`,
              { status: statusUpdate },
              {
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            logger.info(`Tournament ${tournament.name} status updated to: ${statusUpdate}`);
          }
        } catch (error) {
          logger.error(`Failed to update tournament ${tournament.name}:`, error.message);
        }
      }
    }
  } catch (error) {
    logger.error('Error updating tournament statuses:', error);
  }
};

// Health check function
const healthCheck = async () => {
  const health = {
    mongodb: 'unknown',
    redis: 'unknown',
    authService: 'unknown',
    tournamentService: 'unknown',
    timestamp: new Date().toISOString()
  };

  try {
    if (mongoose.connection.readyState === 1) {
      health.mongodb = 'connected';
    } else {
      health.mongodb = 'disconnected';
    }
  } catch (error) {
    health.mongodb = 'error';
  }

  try {
    if (redisClient && redisClient.isReady) {
      await redisClient.ping();
      health.redis = 'connected';
    } else {
      health.redis = 'disconnected';
    }
  } catch (error) {
    health.redis = 'error';
  }

  try {
    const authResponse = await axios.get(`${config.authServiceUrl}/health`);
    health.authService = authResponse.status === 200 ? 'healthy' : 'unhealthy';
  } catch (error) {
    health.authService = 'error';
  }

  try {
    const tournamentResponse = await axios.get(`${config.tournamentServiceUrl}/health`);
    health.tournamentService = tournamentResponse.status === 200 ? 'healthy' : 'unhealthy';
  } catch (error) {
    health.tournamentService = 'error';
  }

  return health;
};

// Main scheduler function
const startScheduler = async () => {
  try {
    logger.info('Starting Scheduler Service...');
    
    // Connect to databases
    await connectMongoDB();
    await connectRedis();
    
    // Get initial authentication token
    await getAuthToken();
    
    // Schedule automated tournament creation every 30 minutes
    cron.schedule(`*/${config.tournamentInterval} * * * *`, async () => {
      logger.info(`Running automated tournament creation (${config.tournamentInterval} minute interval)`);
      await scheduleAutomatedTournaments();
    });
    
    // Schedule tournament status updates every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      await updateTournamentStatuses();
    });
    
    // Schedule health check every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
      const health = await healthCheck();
      logger.info('Health check completed:', health);
    });
    
    logger.info(`Scheduler service started successfully`);
    logger.info(`Tournament creation interval: ${config.tournamentInterval} minutes`);
    logger.info(`Status update interval: 5 minutes`);
    logger.info(`Health check interval: 10 minutes`);
    
    // Run initial tournament creation
    await scheduleAutomatedTournaments();
    
  } catch (error) {
    logger.error('Failed to start scheduler service:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close database connections
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
    }
    
    if (redisClient && redisClient.isReady) {
      await redisClient.quit();
      logger.info('Redis connection closed');
    }
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the scheduler
startScheduler();
