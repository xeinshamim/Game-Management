const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  matchId: {
    type: String,
    required: true,
    unique: true,
    default: () => require('uuid').v4()
  },
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
    index: true
  },
  matchNumber: {
    type: Number,
    required: true
  },
  matchType: {
    type: String,
    enum: ['BR_MATCH', 'CLASH_SQUAD', 'LONE_WOLF', 'CS_2VS2'],
    required: true
  },
  status: {
    type: String,
    enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PAUSED'],
    default: 'SCHEDULED'
  },
  scheduledTime: {
    type: Date,
    required: true,
    index: true
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number, // in minutes
    default: 0
  },
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    },
    teamId: {
      type: String
    },
    isReady: {
      type: Boolean,
      default: false
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: {
      type: Date
    }
  }],
  maxParticipants: {
    type: Number,
    required: true
  },
  minParticipants: {
    type: Number,
    required: true
  },
  entryFee: {
    type: Number,
    default: 0
  },
  prizePool: {
    first: { type: Number, default: 0 },
    second: { type: Number, default: 0 },
    third: { type: Number, default: 0 }
  },
  results: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    },
    position: {
      type: Number,
      required: true
    },
    score: {
      type: Number,
      default: 0
    },
    kills: {
      type: Number,
      default: 0
    },
    deaths: {
      type: Number,
      default: 0
    },
    assists: {
      type: Number,
      default: 0
    },
    damageDealt: {
      type: Number,
      default: 0
    },
    damageTaken: {
      type: Number,
      default: 0
    },
    survivalTime: {
      type: Number, // in seconds
      default: 0
    },
    bonusPoints: {
      type: Number,
      default: 0
    },
    totalPoints: {
      type: Number,
      default: 0
    }
  }],
  matchSettings: {
    map: {
      type: String,
      required: true
    },
    gameMode: {
      type: String,
      required: true
    },
    timeLimit: {
      type: Number, // in minutes
      default: 30
    },
    killReward: {
      type: Number,
      default: 10
    },
    survivalReward: {
      type: Number,
      default: 5
    },
    bonusMultiplier: {
      type: Number,
      default: 1.0
    }
  },
  antiCheatFlags: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    flagType: {
      type: String,
      enum: ['SUSPICIOUS_MOVEMENT', 'UNUSUAL_ACCURACY', 'SPEED_HACK', 'AIMBOT', 'WALLHACK', 'OTHER']
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100
    },
    description: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    reviewed: {
      type: Boolean,
      default: false
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    reviewResult: {
      type: String,
      enum: ['FALSE_POSITIVE', 'CONFIRMED', 'UNDER_INVESTIGATION']
    }
  }],
  chatLog: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    messageType: {
      type: String,
      enum: ['CHAT', 'SYSTEM', 'ADMIN'],
      default: 'CHAT'
    }
  }],
  technicalIssues: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    issueType: {
      type: String,
      enum: ['LAG', 'DISCONNECT', 'CRASH', 'GRAPHICAL_GLITCH', 'OTHER']
    },
    description: String,
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM'
    },
    reportedAt: {
      type: Date,
      default: Date.now
    },
    resolved: {
      type: Boolean,
      default: false
    },
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  }],
  metadata: {
    serverRegion: String,
    serverInstance: String,
    gameVersion: String,
    customRules: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for performance
matchSchema.index({ tournamentId: 1, matchNumber: 1 });
matchSchema.index({ status: 1, scheduledTime: 1 });
matchSchema.index({ 'participants.userId': 1 });
matchSchema.index({ matchId: 1 });

// Pre-save hook to calculate duration
matchSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    this.duration = Math.round((this.endTime - this.startTime) / (1000 * 60));
  }
  next();
});

// Method to add participant
matchSchema.methods.addParticipant = function(userId, username, teamId = null) {
  if (this.participants.length >= this.maxParticipants) {
    throw new Error('Match is full');
  }
  
  if (this.status !== 'SCHEDULED') {
    throw new Error('Cannot add participants to a match that has already started');
  }
  
  const existingParticipant = this.participants.find(p => p.userId.toString() === userId.toString());
  if (existingParticipant) {
    throw new Error('User is already a participant');
  }
  
  this.participants.push({
    userId,
    username,
    teamId,
    isReady: false,
    joinedAt: new Date()
  });
  
  return this.save();
};

// Method to remove participant
matchSchema.methods.removeParticipant = function(userId) {
  if (this.status !== 'SCHEDULED') {
    throw new Error('Cannot remove participants from a match that has already started');
  }
  
  const participantIndex = this.participants.findIndex(p => p.userId.toString() === userId.toString());
  if (participantIndex === -1) {
    throw new Error('User is not a participant');
  }
  
  this.participants.splice(participantIndex, 1);
  return this.save();
};

// Method to start match
matchSchema.methods.startMatch = function() {
  if (this.participants.length < this.minParticipants) {
    throw new Error('Not enough participants to start match');
  }
  
  if (this.status !== 'SCHEDULED') {
    throw new Error('Match cannot be started in current status');
  }
  
  this.status = 'IN_PROGRESS';
  this.startTime = new Date();
  return this.save();
};

// Method to end match
matchSchema.methods.endMatch = function() {
  if (this.status !== 'IN_PROGRESS') {
    throw new Error('Match is not in progress');
  }
  
  this.status = 'COMPLETED';
  this.endTime = new Date();
  
  // Calculate final scores if not already set
  if (this.results.length === 0) {
    this.calculateFinalScores();
  }
  
  return this.save();
};

// Method to calculate final scores
matchSchema.methods.calculateFinalScores = function() {
  this.results = this.participants.map(participant => {
    // This is a simplified scoring system - in production, this would be more complex
    const baseScore = participant.kills * this.matchSettings.killReward;
    const survivalScore = participant.survivalTime * this.matchSettings.survivalReward;
    const totalScore = (baseScore + survivalScore + participant.bonusPoints) * this.matchSettings.bonusMultiplier;
    
    return {
      userId: participant.userId,
      username: participant.username,
      position: 0, // Will be set after sorting
      score: totalScore,
      kills: participant.kills || 0,
      deaths: participant.deaths || 0,
      assists: participant.assists || 0,
      damageDealt: participant.damageDealt || 0,
      damageTaken: participant.damageTaken || 0,
      survivalTime: participant.survivalTime || 0,
      bonusPoints: participant.bonusPoints || 0,
      totalPoints: totalScore
    };
  });
  
  // Sort by total points and assign positions
  this.results.sort((a, b) => b.totalPoints - a.totalPoints);
  this.results.forEach((result, index) => {
    result.position = index + 1;
  });
};

// Method to add anti-cheat flag
matchSchema.methods.addAntiCheatFlag = function(userId, flagType, confidence, description) {
  this.antiCheatFlags.push({
    userId,
    flagType,
    confidence,
    description,
    timestamp: new Date()
  });
  
  return this.save();
};

// Method to add chat message
matchSchema.methods.addChatMessage = function(userId, username, message, messageType = 'CHAT') {
  this.chatLog.push({
    userId,
    username,
    message,
    messageType,
    timestamp: new Date()
  });
  
  return this.save();
};

// Method to report technical issue
matchSchema.methods.reportTechnicalIssue = function(userId, issueType, description, severity = 'MEDIUM') {
  this.technicalIssues.push({
    userId,
    issueType,
    description,
    severity,
    reportedAt: new Date()
  });
  
  return this.save();
};

// Static method to get matches by tournament
matchSchema.statics.getByTournament = function(tournamentId, status = null) {
  const query = { tournamentId };
  if (status) query.status = status;
  
  return this.find(query).sort({ matchNumber: 1 });
};

// Static method to get upcoming matches
matchSchema.statics.getUpcoming = function(limit = 10) {
  return this.find({
    status: 'SCHEDULED',
    scheduledTime: { $gte: new Date() }
  })
  .sort({ scheduledTime: 1 })
  .limit(limit)
  .populate('tournamentId', 'name type');
};

// Static method to get live matches
matchSchema.statics.getLive = function() {
  return this.find({ status: 'IN_PROGRESS' })
  .populate('tournamentId', 'name type')
  .populate('participants.userId', 'username profile.displayName');
};

module.exports = mongoose.model('Match', matchSchema);
