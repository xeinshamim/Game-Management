const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'FRIEND_REQUEST',
      'FRIEND_REQUEST_ACCEPTED',
      'FRIEND_REQUEST_REJECTED',
      'TOURNAMENT_INVITE',
      'TOURNAMENT_STARTING',
      'TOURNAMENT_RESULT',
      'MATCH_INVITE',
      'MATCH_STARTING',
      'MATCH_RESULT',
      'ACHIEVEMENT_UNLOCKED',
      'BADGE_EARNED',
      'RANK_UP',
      'PRIZE_WON',
      'SYSTEM_ANNOUNCEMENT',
      'MAINTENANCE_NOTICE',
      'SECURITY_ALERT',
      'PAYMENT_SUCCESS',
      'PAYMENT_FAILED',
      'WITHDRAWAL_APPROVED',
      'WITHDRAWAL_REJECTED',
      'KYC_APPROVED',
      'KYC_REJECTED',
      'ACCOUNT_SUSPENDED',
      'ACCOUNT_RESTORED'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  // Rich content for enhanced notifications
  content: {
    image: String,
    actionUrl: String,
    actionText: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  // Priority levels
  priority: {
    type: String,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL'
  },
  // Read status
  isRead: {
    type: Boolean,
    default: false
  },
  // Delivery status
  deliveryStatus: {
    type: String,
    enum: ['PENDING', 'SENT', 'DELIVERED', 'FAILED'],
    default: 'PENDING'
  },
  // Delivery channels
  deliveryChannels: [{
    type: String,
    enum: ['IN_APP', 'PUSH', 'EMAIL', 'SMS'],
    default: 'IN_APP'
  }],
  // Delivery attempts
  deliveryAttempts: {
    type: Number,
    default: 0
  },
  // Scheduled delivery
  scheduledFor: {
    type: Date
  },
  // Expiration
  expiresAt: {
    type: Date
  },
  // Related entities
  relatedEntities: {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament'
    },
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    friendRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FriendRequest'
    },
    transactionId: {
      type: String
    }
  },
  // User preferences for this notification type
  userPreferences: {
    shouldShow: {
      type: Boolean,
      default: true
    },
    shouldSendPush: {
      type: Boolean,
      default: true
    },
    shouldSendEmail: {
      type: Boolean,
      default: true
    },
    shouldSendSMS: {
      type: Boolean,
      default: false
    }
  },
  // Analytics and tracking
  analytics: {
    openedAt: Date,
    clickedAt: Date,
    actionTaken: String,
    timeSpent: Number // in seconds
  },
  // Batch notifications
  batchId: {
    type: String
  },
  // Localization
  locale: {
    type: String,
    default: 'en'
  },
  // Template information
  template: {
    name: String,
    version: String,
    variables: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for performance
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ deliveryStatus: 1, scheduledFor: 1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ batchId: 1 });

// Pre-save hook to set expiration if not provided
notificationSchema.pre('save', function(next) {
  if (!this.expiresAt) {
    // Default expiration: 30 days from creation
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  
  // Set priority based on type
  if (this.type === 'SECURITY_ALERT' || this.type === 'ACCOUNT_SUSPENDED') {
    this.priority = 'URGENT';
  } else if (this.type === 'TOURNAMENT_STARTING' || this.type === 'MATCH_STARTING') {
    this.priority = 'HIGH';
  } else if (this.type === 'ACHIEVEMENT_UNLOCKED' || this.type === 'BADGE_EARNED') {
    this.priority = 'LOW';
  }
  
  next();
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.analytics.openedAt = new Date();
  return this.save();
};

// Method to mark as delivered
notificationSchema.methods.markAsDelivered = function() {
  this.deliveryStatus = 'DELIVERED';
  return this.save();
};

// Method to mark as failed
notificationSchema.methods.markAsFailed = function() {
  this.deliveryStatus = 'FAILED';
  this.deliveryAttempts += 1;
  return this.save();
};

// Method to retry delivery
notificationSchema.methods.retryDelivery = function() {
  this.deliveryStatus = 'PENDING';
  return this.save();
};

// Method to update analytics
notificationSchema.methods.updateAnalytics = function(action, timeSpent = null) {
  if (action === 'click') {
    this.analytics.clickedAt = new Date();
  }
  if (action === 'action') {
    this.analytics.actionTaken = action;
  }
  if (timeSpent !== null) {
    this.analytics.timeSpent = timeSpent;
  }
  return this.save();
};

// Method to check if notification is expired
notificationSchema.methods.isExpired = function() {
  return this.expiresAt && new Date() > this.expiresAt;
};

// Method to check if notification should be delivered
notificationSchema.methods.shouldDeliver = function() {
  return this.deliveryStatus === 'PENDING' && 
         !this.isExpired() && 
         this.userPreferences.shouldShow;
};

// Static method to get unread notifications for a user
notificationSchema.statics.getUnreadNotifications = function(userId, limit = 50) {
  return this.find({
    userId,
    isRead: false,
    expiresAt: { $gt: new Date() }
  })
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit)
    .populate('relatedEntities.tournamentId', 'name type')
    .populate('relatedEntities.matchId', 'matchNumber matchType')
    .populate('relatedEntities.userId', 'username profile.displayName');
};

// Static method to get notifications by type
notificationSchema.statics.getNotificationsByType = function(userId, type, limit = 20) {
  return this.find({
    userId,
    type,
    expiresAt: { $gt: new Date() }
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('relatedEntities.tournamentId', 'name type')
    .populate('relatedEntities.matchId', 'matchNumber matchType');
};

// Static method to get high priority notifications
notificationSchema.statics.getHighPriorityNotifications = function(userId, limit = 10) {
  return this.find({
    userId,
    priority: { $in: ['HIGH', 'URGENT'] },
    isRead: false,
    expiresAt: { $gt: new Date() }
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to mark multiple notifications as read
notificationSchema.statics.markMultipleAsRead = function(userId, notificationIds) {
  return this.updateMany(
    {
      _id: { $in: notificationIds },
      userId
    },
    {
      $set: {
        isRead: true,
        'analytics.openedAt': new Date()
      }
    }
  );
};

// Static method to delete expired notifications
notificationSchema.statics.deleteExpiredNotifications = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

// Static method to get pending notifications for delivery
notificationSchema.statics.getPendingNotifications = function(limit = 100) {
  return this.find({
    deliveryStatus: 'PENDING',
    scheduledFor: { $lte: new Date() },
    expiresAt: { $gt: new Date() }
  })
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit);
};

// Static method to create batch notification
notificationSchema.statics.createBatchNotification = function(userIds, notificationData, batchId) {
  const notifications = userIds.map(userId => ({
    ...notificationData,
    userId,
    batchId
  }));
  
  return this.insertMany(notifications);
};

// Static method to get notification statistics for a user
notificationSchema.statics.getNotificationStats = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: { $sum: { $cond: ['$isRead', 0, 1] } },
        byType: {
          $push: {
            type: '$type',
            count: 1,
            isRead: '$isRead'
          }
        },
        byPriority: {
          $push: {
            priority: '$priority',
            count: 1
          }
        }
      }
    }
  ]);
};

// Static method to get notification templates
notificationSchema.statics.getNotificationTemplates = function() {
  return this.distinct('template.name');
};

// Static method to create system notification
notificationSchema.statics.createSystemNotification = function(userIds, type, title, message, options = {}) {
  const notifications = userIds.map(userId => ({
    userId,
    type,
    title,
    message,
    priority: options.priority || 'NORMAL',
    deliveryChannels: options.deliveryChannels || ['IN_APP'],
    scheduledFor: options.scheduledFor || new Date(),
    expiresAt: options.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    content: options.content || {},
    relatedEntities: options.relatedEntities || {},
    batchId: options.batchId,
    locale: options.locale || 'en'
  }));
  
  return this.insertMany(notifications);
};

module.exports = mongoose.model('Notification', notificationSchema);
