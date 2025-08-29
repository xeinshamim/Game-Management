const mongoose = require('mongoose');

const antiCheatFlagSchema = new mongoose.Schema({
  flagId: {
    type: String,
    required: true,
    unique: true,
    default: () => `ACF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true,
    index: true
  },
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    index: true
  },
  // Detection details
  detectionType: {
    type: String,
    enum: [
      'AUTOMATED_SCAN',
      'MANUAL_REPORT',
      'PATTERN_ANALYSIS',
      'BEHAVIOR_ANALYSIS',
      'PERFORMANCE_ANOMALY',
      'NETWORK_ANALYSIS',
      'FILE_INTEGRITY_CHECK',
      'MEMORY_SCAN',
      'PROCESS_MONITORING'
    ],
    required: true
  },
  cheatType: {
    type: String,
    enum: [
      'AIMBOT',
      'WALLHACK',
      'SPEED_HACK',
      'ESP',
      'TRIGGER_BOT',
      'BUNNY_HOP',
      'MACRO_USE',
      'MODIFIED_CLIENT',
      'INJECTED_CODE',
      'MEMORY_MODIFICATION',
      'NETWORK_MANIPULATION',
      'UNUSUAL_ACCURACY',
      'SUSPICIOUS_MOVEMENT',
      'PATTERN_ANOMALY',
      'OTHER'
    ],
    required: true
  },
  // Severity and confidence
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  // Evidence and details
  evidence: {
    screenshots: [String],
    logs: [String],
    metrics: {
      accuracy: Number,
      reactionTime: Number,
      movementSpeed: Number,
      killDistance: Number,
      headshotRatio: Number,
      suspiciousActions: Number
    },
    timestamps: [Date],
    coordinates: [{
      x: Number,
      y: Number,
      z: Number,
      timestamp: Date
    }],
    networkData: {
      latency: Number,
      packetLoss: Number,
      connectionQuality: String
    }
  },
  // Description and context
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  context: {
    gamePhase: String,
    playerState: String,
    surroundingPlayers: Number,
    timeInMatch: Number
  },
  // Status and resolution
  status: {
    type: String,
    enum: ['PENDING', 'UNDER_REVIEW', 'CONFIRMED', 'FALSE_POSITIVE', 'RESOLVED', 'ESCALATED'],
    default: 'PENDING'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  reviewedAt: Date,
  reviewNotes: String,
  // Actions taken
  actions: [{
    action: {
      type: String,
      enum: [
        'WARNING_SENT',
        'MATCH_DISQUALIFICATION',
        'TOURNAMENT_BAN',
        'TEMPORARY_SUSPENSION',
        'PERMANENT_BAN',
        'EVIDENCE_COLLECTED',
        'ESCALATED_TO_ADMIN',
        'NO_ACTION'
      ]
    },
    takenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    takenAt: {
      type: Date,
      default: Date.now
    },
    notes: String,
    duration: Number // for suspensions/bans in hours
  }],
  // Appeal information
  appeal: {
    isAppealed: {
      type: Boolean,
      default: false
    },
    appealedAt: Date,
    appealReason: String,
    appealStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING'
    },
    appealReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    appealReviewedAt: Date,
    appealNotes: String
  },
  // Analytics and patterns
  patternData: {
    previousFlags: [{
      flagId: String,
      cheatType: String,
      date: Date
    }],
    frequency: Number,
    timePattern: String,
    relatedUsers: [{
      userId: mongoose.Schema.Types.ObjectId,
      relationship: String
    }]
  },
  // Metadata
  metadata: {
    clientVersion: String,
    platform: String,
    region: String,
    ipAddress: String,
    deviceInfo: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for performance
antiCheatFlagSchema.index({ userId: 1, createdAt: -1 });
antiCheatFlagSchema.index({ matchId: 1, createdAt: -1 });
antiCheatFlagSchema.index({ status: 1, severity: 1 });
antiCheatFlagSchema.index({ cheatType: 1, confidence: -1 });
antiCheatFlagSchema.index({ detectionType: 1, createdAt: -1 });

// Pre-save hook to set severity based on confidence and cheat type
antiCheatFlagSchema.pre('save', function(next) {
  // Auto-set severity based on confidence and cheat type
  if (this.confidence >= 90 || this.cheatType === 'AIMBOT' || this.cheatType === 'WALLHACK') {
    this.severity = 'CRITICAL';
  } else if (this.confidence >= 75 || this.cheatType === 'SPEED_HACK' || this.cheatType === 'ESP') {
    this.severity = 'HIGH';
  } else if (this.confidence >= 50) {
    this.severity = 'MEDIUM';
  } else {
    this.severity = 'LOW';
  }

  next();
});

// Method to add action
antiCheatFlagSchema.methods.addAction = function(action, adminId, notes = '', duration = null) {
  this.actions.push({
    action,
    takenBy: adminId,
    notes,
    duration
  });
  return this.save();
};

// Method to update status
antiCheatFlagSchema.methods.updateStatus = function(newStatus, adminId, notes = '') {
  this.status = newStatus;
  if (adminId) {
    this.reviewedBy = adminId;
    this.reviewedAt = new Date();
    this.reviewNotes = notes;
  }
  return this.save();
};

// Method to appeal
antiCheatFlagSchema.methods.appeal = function(reason) {
  this.appeal.isAppealed = true;
  this.appeal.appealedAt = new Date();
  this.appeal.appealReason = reason;
  this.appeal.appealStatus = 'PENDING';
  return this.save();
};

// Method to review appeal
antiCheatFlagSchema.methods.reviewAppeal = function(status, adminId, notes = '') {
  this.appeal.appealStatus = status;
  this.appeal.appealReviewedBy = adminId;
  this.appeal.appealReviewedAt = new Date();
  this.appeal.appealNotes = notes;
  return this.save();
};

// Method to check if user has previous flags
antiCheatFlagSchema.methods.hasPreviousFlags = function() {
  return this.patternData.previousFlags.length > 0;
};

// Method to get flag summary
antiCheatFlagSchema.methods.getSummary = function() {
  return {
    flagId: this.flagId,
    userId: this.userId,
    cheatType: this.cheatType,
    severity: this.severity,
    confidence: this.confidence,
    status: this.status,
    createdAt: this.createdAt,
    description: this.description
  };
};

// Static method to get flags by user
antiCheatFlagSchema.statics.getFlagsByUser = function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('matchId', 'matchNumber matchType')
    .populate('tournamentId', 'name type');
};

// Static method to get flags by match
antiCheatFlagSchema.statics.getFlagsByMatch = function(matchId) {
  return this.find({ matchId })
    .populate('userId', 'username profile.displayName')
    .sort({ createdAt: -1 });
};

// Static method to get pending flags
antiCheatFlagSchema.statics.getPendingFlags = function(limit = 100) {
  return this.find({ status: 'PENDING' })
    .sort({ severity: -1, confidence: -1, createdAt: 1 })
    .limit(limit)
    .populate('userId', 'username profile.displayName')
    .populate('matchId', 'matchNumber matchType');
};

// Static method to get high severity flags
antiCheatFlagSchema.statics.getHighSeverityFlags = function(limit = 50) {
  return this.find({
    severity: { $in: ['HIGH', 'CRITICAL'] },
    status: { $in: ['PENDING', 'UNDER_REVIEW'] }
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username profile.displayName');
};

// Static method to get flags by cheat type
antiCheatFlagSchema.statics.getFlagsByCheatType = function(cheatType, limit = 100) {
  return this.find({ cheatType })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username profile.displayName');
};

// Static method to get statistics
antiCheatFlagSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalFlags: { $sum: 1 },
        byStatus: {
          $push: {
            status: '$status',
            count: 1
          }
        },
        bySeverity: {
          $push: {
            severity: '$severity',
            count: 1
          }
        },
        byCheatType: {
          $push: {
            cheatType: '$cheatType',
            count: 1
          }
        },
        byDetectionType: {
          $push: {
            detectionType: '$detectionType',
            count: 1
          }
        }
      }
    }
  ]);
};

// Static method to get user risk score
antiCheatFlagSchema.statics.getUserRiskScore = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$userId',
        totalFlags: { $sum: 1 },
        criticalFlags: { $sum: { $cond: [{ $eq: ['$severity', 'CRITICAL'] }, 1, 0] } },
        highFlags: { $sum: { $cond: [{ $eq: ['$severity', 'HIGH'] }, 1, 0] } },
        confirmedFlags: { $sum: { $cond: [{ $eq: ['$status', 'CONFIRMED'] }, 1, 0] } },
        recentFlags: { $sum: { $cond: [{ $gte: ['$createdAt', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] }, 1, 0] } }
      }
    },
    {
      $addFields: {
        riskScore: {
          $add: [
            { $multiply: ['$criticalFlags', 100] },
            { $multiply: ['$highFlags', 50] },
            { $multiply: ['$confirmedFlags', 25] },
            { $multiply: ['$recentFlags', 10] }
          ]
        }
      }
    }
  ]);
};

module.exports = mongoose.model('AntiCheatFlag', antiCheatFlagSchema);
