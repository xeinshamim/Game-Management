const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userProfileSchema = new mongoose.Schema({
  displayName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  avatar: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  country: {
    type: String,
    maxlength: 100,
    default: ''
  },
  timezone: {
    type: String,
    default: 'UTC'
  }
});

const walletSchema = new mongoose.Schema({
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'BDT',
    enum: ['BDT', 'USD']
  },
  transactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }]
});

const userStatsSchema = new mongoose.Schema({
  totalMatches: {
    type: Number,
    default: 0,
    min: 0
  },
  totalWins: {
    type: Number,
    default: 0,
    min: 0
  },
  totalLosses: {
    type: Number,
    default: 0,
    min: 0
  },
  totalEarnings: {
    type: Number,
    default: 0,
    min: 0
  },
  winRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  rank: {
    type: Number,
    default: 0,
    min: 0
  }
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9_]+$/
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    match: /^\+?[\d\s\-\(\)]+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  profile: {
    type: userProfileSchema,
    required: true
  },
  wallet: {
    type: walletSchema,
    default: () => ({})
  },
  stats: {
    type: userStatsSchema,
    default: () => ({})
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  banReason: {
    type: String,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    default: null
  },
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.twoFactorSecret;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      return ret;
    }
  }
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ isBanned: 1 });
userSchema.index({ createdAt: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update win rate
userSchema.pre('save', function(next) {
  if (this.stats.totalMatches > 0) {
    this.stats.winRate = Math.round((this.stats.totalWins / this.stats.totalMatches) * 100);
  }
  next();
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to update stats
userSchema.methods.updateStats = function(matchResult) {
  this.stats.totalMatches += 1;
  
  if (matchResult === 'win') {
    this.stats.totalWins += 1;
  } else if (matchResult === 'loss') {
    this.stats.totalLosses += 1;
  }
  
  if (this.stats.totalMatches > 0) {
    this.stats.winRate = Math.round((this.stats.totalWins / this.stats.totalMatches) * 100);
  }
  
  return this.save();
};

// Static method to find by email or username
userSchema.statics.findByEmailOrUsername = function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier }
    ]
  });
};

// Static method to check if username is available
userSchema.statics.isUsernameAvailable = function(username) {
  return this.findOne({ username }).then(user => !user);
};

// Static method to check if email is available
userSchema.statics.isEmailAvailable = function(email) {
  return this.findOne({ email: email.toLowerCase() }).then(user => !user);
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.profile.displayName;
});

// Virtual for isOnline (can be implemented with Redis)
userSchema.virtual('isOnline').get(function() {
  return false; // Placeholder - implement with Redis session tracking
});

module.exports = mongoose.model('User', userSchema);
