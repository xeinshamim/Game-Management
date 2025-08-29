const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    default: () => require('uuid').v4()
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['DEPOSIT', 'WITHDRAWAL', 'PRIZE_WIN', 'TOURNAMENT_FEE', 'REFUND', 'ADMIN_ADJUSTMENT'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'BDT',
    enum: ['BDT', 'USD']
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    default: 'PENDING'
  },
  paymentMethod: {
    type: String,
    enum: ['BKASH', 'NAGAD', 'WALLET_BALANCE', 'ADMIN'],
    required: function() {
      return ['DEPOSIT', 'WITHDRAWAL'].includes(this.type);
    }
  },
  paymentGateway: {
    type: String,
    enum: ['BKASH_API', 'NAGAD_API', 'INTERNAL'],
    required: function() {
      return ['DEPOSIT', 'WITHDRAWAL'].includes(this.type);
    }
  },
  gatewayTransactionId: {
    type: String,
    sparse: true
  },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament'
    },
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match'
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  },
  fees: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number,
    required: true
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  processedAt: {
    type: Date
  },
  failureReason: {
    type: String
  },
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  }
}, {
  timestamps: true
});

// Indexes for performance
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ gatewayTransactionId: 1 });

// Pre-save hook to calculate net amount
transactionSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('fees')) {
    this.netAmount = this.amount - this.fees;
  }
  next();
});

// Method to mark transaction as completed
transactionSchema.methods.markCompleted = function() {
  this.status = 'COMPLETED';
  this.processedAt = new Date();
  return this.save();
};

// Method to mark transaction as failed
transactionSchema.methods.markFailed = function(reason) {
  this.status = 'FAILED';
  this.failureReason = reason;
  return this.save();
};

// Method to retry transaction
transactionSchema.methods.retry = function() {
  if (this.retryCount < this.maxRetries) {
    this.retryCount += 1;
    this.status = 'PENDING';
    return this.save();
  }
  return Promise.reject(new Error('Max retries exceeded'));
};

// Static method to get transaction summary
transactionSchema.statics.getSummary = async function(userId, startDate, endDate) {
  const match = { userId: new mongoose.Types.ObjectId(userId) };
  
  if (startDate && endDate) {
    match.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalNetAmount: { $sum: '$netAmount' },
        totalFees: { $sum: '$fees' }
      }
    }
  ]);
};

module.exports = mongoose.model('Transaction', transactionSchema);
