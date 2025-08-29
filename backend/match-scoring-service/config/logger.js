const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'match-scoring-service' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat
    }),
    
    // File transport for errors
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// If we're not in production, log to console with more detail
if (process.env.NODE_ENV !== 'production') {
  logger.level = 'debug';
}

// Handle uncaught exceptions
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/exceptions.log')
  })
);

// Handle unhandled promise rejections
logger.rejections.handle(
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/rejections.log')
  })
);

module.exports = logger;
