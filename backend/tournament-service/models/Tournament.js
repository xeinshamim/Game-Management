const mongoose = require('mongoose');

const prizePoolSchema = new mongoose.Schema({
  first: {
    type: Number,
    required: true,
    min: 0
  },
  second: {
    type: Number,
    required: true,
    min: 0
  },
  third: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  }
});

const tournamentRulesSchema = new mongoose.Schema({
  maxPlayers: {
    type: Number,
    required: true,
    min: 2,
    max: 100
  },
  minPlayers: {
    type: Number,
    required: true,
    min: 2
  },
  gameMode: {
    type: String,
    required: true,
    enum: ['single_elimination', 'double_elimination', 'round_robin', 'swiss_system', 'battle_royale']
  },
  map: {
    type: String,
    default: null
  },
  timeLimit: {
    type: Number, // in minutes
    default: null
  },
  customRules: [{
    type: String,
    maxlength: 200
  }],
  allowSpectators: {
    type: Boolean,
    default: true
  },
  autoStart: {
    type: Boolean,
    default: false
  }
});

const tournamentParticipantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  registrationTime: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['registered', 'confirmed', 'disqualified', 'withdrawn'],
    default: 'registered'
  },
  seed: {
    type: Number,
    default: null
  },
  checkInTime: {
    type: Date,
    default: null
  },
  isCheckedIn: {
    type: Boolean,
    default: false
  },
  entryFeePaid: {
    type: Boolean,
    default: false
  },
  paymentTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null
  }
});

const matchSchema = new mongoose.Schema({
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  matchNumber: {
    type: Number,
    required: true
  },
  round: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed', 'cancelled'],
    default: 'scheduled'
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
    score: {
      type: Number,
      default: 0
    },
    rank: {
      type: Number,
      default: null
    },
    isWinner: {
      type: Boolean,
      default: false
    }
  }],
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number, // in minutes
    default: null
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
});

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  gameType: {
    type: String,
    required: true,
    enum: ['BR_MATCH', 'CLASH_SQUAD', 'LONE_WOLF', 'CS_2_VS_2']
  },
  type: {
    type: String,
    required: true,
    enum: ['automated', 'manual', 'custom'],
    default: 'manual'
  },
  status: {
    type: String,
    required: true,
    enum: ['upcoming', 'registration_open', 'registration_closed', 'live', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  description: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  registrationDeadline: {
    type: Date,
    required: true
  },
  checkInDeadline: {
    type: Date,
    default: null
  },
  maxParticipants: {
    type: Number,
    required: true,
    min: 2,
    max: 100
  },
  minParticipants: {
    type: Number,
    required: true,
    min: 2
  },
  currentParticipants: {
    type: Number,
    default: 0
  },
  entryFee: {
    type: Number,
    required: true,
    min: 0
  },
  prizePool: {
    type: prizePoolSchema,
    required: true
  },
  rules: {
    type: tournamentRulesSchema,
    required: true
  },
  participants: [tournamentParticipantSchema],
  matches: [matchSchema],
  brackets: {
    type: mongoose.Schema.Types.Mixed, // Store bracket structure
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  tags: [{
    type: String,
    maxlength: 20
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  registrationCount: {
    type: Number,
    default: 0
  },
  completedMatches: {
    type: Number,
    default: 0
  },
  totalMatches: {
    type: Number,
    default: 0
  },
  cancellationReason: {
    type: String,
    maxlength: 500,
    default: null
  },
  autoStartThreshold: {
    type: Number,
    default: 0.8 // 80% of max participants
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
tournamentSchema.index({ startTime: 1 });
tournamentSchema.index({ status: 1 });
tournamentSchema.index({ gameType: 1 });
tournamentSchema.index({ createdBy: 1 });
tournamentSchema.index({ 'participants.userId': 1 });
tournamentSchema.index({ isPublic: 1 });
tournamentSchema.index({ isFeatured: 1 });
tournamentSchema.index({ createdAt: 1 });
tournamentSchema.index({ registrationDeadline: 1 });
tournamentSchema.index({ checkInDeadline: 1 });

// Pre-save middleware to calculate total prize pool
tournamentSchema.pre('save', function(next) {
  if (this.prizePool) {
    this.prizePool.total = this.prizePool.first + this.prizePool.second + this.prizePool.third;
  }
  next();
});

// Pre-save middleware to update current participants count
tournamentSchema.pre('save', function(next) {
  if (this.participants) {
    this.currentParticipants = this.participants.filter(p => p.status === 'confirmed').length;
  }
  next();
});

// Pre-save middleware to update total matches count
tournamentSchema.pre('save', function(next) {
  if (this.matches) {
    this.totalMatches = this.matches.length;
    this.completedMatches = this.matches.filter(m => m.status === 'completed').length;
  }
  next();
});

// Instance method to add participant
tournamentSchema.methods.addParticipant = function(userId, username) {
  if (this.currentParticipants >= this.maxParticipants) {
    throw new Error('Tournament is full');
  }

  if (this.status !== 'registration_open') {
    throw new Error('Tournament registration is closed');
  }

  const existingParticipant = this.participants.find(p => p.userId.toString() === userId.toString());
  if (existingParticipant) {
    throw new Error('User is already registered');
  }

  this.participants.push({
    userId,
    username,
    registrationTime: new Date(),
    status: 'registered'
  });

  this.registrationCount += 1;
  return this.save();
};

// Instance method to remove participant
tournamentSchema.methods.removeParticipant = function(userId) {
  const participantIndex = this.participants.findIndex(p => p.userId.toString() === userId.toString());
  
  if (participantIndex === -1) {
    throw new Error('Participant not found');
  }

  this.participants.splice(participantIndex, 1);
  this.registrationCount = Math.max(0, this.registrationCount - 1);
  return this.save();
};

// Instance method to confirm participant
tournamentSchema.methods.confirmParticipant = function(userId) {
  const participant = this.participants.find(p => p.userId.toString() === userId.toString());
  
  if (!participant) {
    throw new Error('Participant not found');
  }

  if (participant.status !== 'registered') {
    throw new Error('Participant is already confirmed or has another status');
  }

  participant.status = 'confirmed';
  participant.checkInTime = new Date();
  participant.isCheckedIn = true;
  
  return this.save();
};

// Instance method to check if tournament can start
tournamentSchema.methods.canStart = function() {
  const confirmedParticipants = this.participants.filter(p => p.status === 'confirmed').length;
  const threshold = Math.ceil(this.maxParticipants * this.autoStartThreshold);
  
  return confirmedParticipants >= threshold && this.status === 'registration_closed';
};

// Instance method to start tournament
tournamentSchema.methods.startTournament = function() {
  if (!this.canStart()) {
    throw new Error('Tournament cannot start yet');
  }

  this.status = 'live';
  this.startTime = new Date();
  
  return this.save();
};

// Instance method to end tournament
tournamentSchema.methods.endTournament = function() {
  if (this.status !== 'live') {
    throw new Error('Tournament is not live');
  }

  this.status = 'completed';
  this.endTime = new Date();
  
  return this.save();
};

// Instance method to cancel tournament
tournamentSchema.methods.cancelTournament = function(reason) {
  if (this.status === 'completed') {
    throw new Error('Cannot cancel completed tournament');
  }

  this.status = 'cancelled';
  this.cancellationReason = reason;
  
  return this.save();
};

// Static method to find upcoming tournaments
tournamentSchema.statics.findUpcoming = function(limit = 10) {
  return this.find({
    status: { $in: ['upcoming', 'registration_open'] },
    startTime: { $gt: new Date() }
  })
  .sort({ startTime: 1 })
  .limit(limit)
  .populate('participants.userId', 'username profile.avatar');
};

// Static method to find live tournaments
tournamentSchema.statics.findLive = function() {
  return this.find({ status: 'live' })
  .populate('participants.userId', 'username profile.avatar')
  .populate('matches.participants.userId', 'username profile.avatar');
};

// Static method to find tournaments by game type
tournamentSchema.statics.findByGameType = function(gameType, limit = 20) {
  return this.find({ gameType })
  .sort({ startTime: -1 })
  .limit(limit)
  .populate('participants.userId', 'username profile.avatar');
};

// Static method to find tournaments by creator
tournamentSchema.statics.findByCreator = function(creatorId, limit = 20) {
  return this.find({ createdBy: creatorId })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('participants.userId', 'username profile.avatar');
};

// Virtual for registration progress
tournamentSchema.virtual('registrationProgress').get(function() {
  return this.maxParticipants > 0 ? (this.currentParticipants / this.maxParticipants) * 100 : 0;
});

// Virtual for time until start
tournamentSchema.virtual('timeUntilStart').get(function() {
  return this.startTime ? this.startTime.getTime() - Date.now() : null;
});

// Virtual for is registration open
tournamentSchema.virtual('isRegistrationOpen').get(function() {
  return this.status === 'registration_open' && new Date() < this.registrationDeadline;
});

module.exports = mongoose.model('Tournament', tournamentSchema);
