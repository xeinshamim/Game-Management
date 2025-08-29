const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
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
  isActive: {
    type: Boolean,
    default: true
  },
  lastTransactionAt: {
    type: Date
  },
  totalDeposited: {
    type: Number,
    default: 0
  },
  totalWithdrawn: {
    type: Number,
    default: 0
  },
  totalWon: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  dailyLimit: {
    type: Number,
    default: 10000 // 10,000 BDT daily limit
  },
  monthlyLimit: {
    type: Number,
    default: 100000 // 100,000 BDT monthly limit
  },
  dailyUsage: {
    amount: { type: Number, default: 0 },
    date: { type: Date, default: Date.now }
  },
  monthlyUsage: {
    amount: { type: Number, default: 0 },
    month: { type: String, default: () => new Date().toISOString().slice(0, 7) }
  },
  securitySettings: {
    requirePin: { type: Boolean, default: false },
    pinHash: { type: String },
    maxTransactionAmount: { type: Number, default: 5000 },
    allowedPaymentMethods: [{
      type: String,
      enum: ['BKASH', 'NAGAD', 'WALLET_BALANCE']
    }]
  },
  verificationStatus: {
    type: String,
    enum: ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'],
    default: 'UNVERIFIED'
  },
  kycDocuments: [{
    type: {
      type: String,
      enum: ['NATIONAL_ID', 'PASSPORT', 'DRIVING_LICENSE', 'BANK_STATEMENT']
    },
    documentNumber: String,
    documentImage: String,
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  }],
  restrictions: {
    isSuspended: { type: Boolean, default: false },
    suspensionReason: String,
    suspensionExpiresAt: Date,
    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
walletSchema.index({ balance: -1 });
walletSchema.index({ lastTransactionAt: -1 });
walletSchema.index({ verificationStatus: 1 });

// Pre-save hook to update last transaction time
walletSchema.pre('save', function(next) {
  if (this.isModified('balance')) {
    this.lastTransactionAt = new Date();
  }
  next();
});

// Method to add funds to wallet
walletSchema.methods.addFunds = async function(amount, transactionType = 'DEPOSIT') {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const balanceBefore = this.balance;
  this.balance += amount;
  
  // Update usage statistics
  this.updateUsageStats(amount, transactionType);
  
  await this.save();
  
  return {
    balanceBefore,
    balanceAfter: this.balance,
    amountAdded: amount
  };
};

// Method to deduct funds from wallet
walletSchema.methods.deductFunds = async function(amount, transactionType = 'TOURNAMENT_FEE') {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }
  
  if (this.balance < amount) {
    throw new Error('Insufficient balance');
  }

  const balanceBefore = this.balance;
  this.balance -= amount;
  
  // Update usage statistics
  this.updateUsageStats(amount, transactionType);
  
  await this.save();
  
  return {
    balanceBefore,
    balanceAfter: this.balance,
    amountDeducted: amount
  };
};

// Method to update usage statistics
walletSchema.methods.updateUsageStats = function(amount, transactionType) {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  
  // Update daily usage
  if (this.dailyUsage.date.toDateString() !== now.toDateString()) {
    this.dailyUsage = { amount: 0, date: now };
  }
  
  // Update monthly usage
  if (this.monthlyUsage.month !== currentMonth) {
    this.monthlyUsage = { amount: 0, month: currentMonth };
  }
  
  // Update totals based on transaction type
  switch (transactionType) {
    case 'DEPOSIT':
      this.totalDeposited += amount;
      this.dailyUsage.amount += amount;
      this.monthlyUsage.amount += amount;
      break;
    case 'WITHDRAWAL':
      this.totalWithdrawn += amount;
      this.dailyUsage.amount += amount;
      this.monthlyUsage.amount += amount;
      break;
    case 'PRIZE_WIN':
      this.totalWon += amount;
      break;
    case 'TOURNAMENT_FEE':
      this.totalSpent += amount;
      break;
  }
};

// Method to check if transaction is within limits
walletSchema.methods.checkLimits = function(amount, transactionType) {
  if (this.restrictions.isSuspended) {
    throw new Error('Wallet is suspended');
  }
  
  if (transactionType === 'WITHDRAWAL') {
    if (this.dailyUsage.amount + amount > this.dailyLimit) {
      throw new Error('Daily withdrawal limit exceeded');
    }
    
    if (this.monthlyUsage.amount + amount > this.monthlyLimit) {
      throw new Error('Monthly withdrawal limit exceeded');
    }
  }
  
  if (amount > this.securitySettings.maxTransactionAmount) {
    throw new Error('Transaction amount exceeds maximum allowed');
  }
  
  return true;
};

// Method to get wallet summary
walletSchema.methods.getSummary = function() {
  return {
    balance: this.balance,
    currency: this.currency,
    totalDeposited: this.totalDeposited,
    totalWithdrawn: this.totalWithdrawn,
    totalWon: this.totalWon,
    totalSpent: this.totalSpent,
    dailyUsage: this.dailyUsage,
    monthlyUsage: this.monthlyUsage,
    verificationStatus: this.verificationStatus,
    isActive: this.isActive
  };
};

// Static method to get wallet by user ID
walletSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId });
};

// Static method to get top wallets by balance
walletSchema.statics.getTopWallets = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ balance: -1 })
    .limit(limit)
    .populate('userId', 'username email profile.displayName');
};

module.exports = mongoose.model('Wallet', walletSchema);
