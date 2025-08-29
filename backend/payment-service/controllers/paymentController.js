const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const { cacheGet, cacheSet, cacheDelete } = require('../config/db');
const logger = require('../config/logger');

class PaymentController {
  // Get wallet balance and summary
  async getWallet(req, res) {
    try {
      const { userId } = req.user;
      const cacheKey = `wallet:${userId}`;
      
      // Try to get from cache first
      let wallet = await cacheGet(cacheKey);
      
      if (!wallet) {
        wallet = await Wallet.findByUserId(userId);
        if (!wallet) {
          return res.status(404).json({
            success: false,
            message: 'Wallet not found'
          });
        }
        
        // Cache wallet data for 5 minutes
        await cacheSet(cacheKey, wallet, 300);
      }
      
      res.json({
        success: true,
        data: wallet.getSummary()
      });
    } catch (error) {
      logger.error('Error getting wallet:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Process deposit
  async processDeposit(req, res) {
    try {
      const { userId } = req.user;
      const { amount, paymentMethod, description } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount'
        });
      }
      
      // Get or create wallet
      let wallet = await Wallet.findByUserId(userId);
      if (!wallet) {
        wallet = new Wallet({ userId });
      }
      
      // Check limits
      wallet.checkLimits(amount, 'DEPOSIT');
      
      // Create transaction record
      const transaction = new Transaction({
        userId,
        type: 'DEPOSIT',
        amount,
        paymentMethod,
        paymentGateway: paymentMethod === 'BKASH' ? 'BKASH_API' : 'NAGAD_API',
        description: description || `Deposit via ${paymentMethod}`,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance + amount
      });
      
      // Process payment through gateway
      const gatewayResponse = await this.processPaymentGateway(paymentMethod, amount, userId);
      
      if (gatewayResponse.success) {
        transaction.gatewayTransactionId = gatewayResponse.transactionId;
        transaction.gatewayResponse = gatewayResponse;
        transaction.status = 'COMPLETED';
        
        // Add funds to wallet
        await wallet.addFunds(amount, 'DEPOSIT');
        await transaction.save();
        
        // Clear cache
        await cacheDelete(`wallet:${userId}`);
        
        res.json({
          success: true,
          message: 'Deposit successful',
          data: {
            transactionId: transaction.transactionId,
            amount,
            balance: wallet.balance
          }
        });
      } else {
        transaction.status = 'FAILED';
        transaction.failureReason = gatewayResponse.error;
        await transaction.save();
        
        res.status(400).json({
          success: false,
          message: 'Deposit failed',
          error: gatewayResponse.error
        });
      }
    } catch (error) {
      logger.error('Error processing deposit:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Process withdrawal
  async processWithdrawal(req, res) {
    try {
      const { userId } = req.user;
      const { amount, paymentMethod, description } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount'
        });
      }
      
      // Get wallet
      const wallet = await Wallet.findByUserId(userId);
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }
      
      // Check limits and balance
      wallet.checkLimits(amount, 'WITHDRAWAL');
      
      // Create transaction record
      const transaction = new Transaction({
        userId,
        type: 'WITHDRAWAL',
        amount,
        paymentMethod,
        paymentGateway: paymentMethod === 'BKASH' ? 'BKASH_API' : 'NAGAD_API',
        description: description || `Withdrawal via ${paymentMethod}`,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance - amount
      });
      
      // Deduct funds from wallet
      await wallet.deductFunds(amount, 'WITHDRAWAL');
      await transaction.save();
      
      // Process withdrawal through gateway
      const gatewayResponse = await this.processWithdrawalGateway(paymentMethod, amount, userId);
      
      if (gatewayResponse.success) {
        transaction.gatewayTransactionId = gatewayResponse.transactionId;
        transaction.gatewayResponse = gatewayResponse;
        transaction.status = 'COMPLETED';
        await transaction.save();
        
        // Clear cache
        await cacheDelete(`wallet:${userId}`);
        
        res.json({
          success: true,
          message: 'Withdrawal successful',
          data: {
            transactionId: transaction.transactionId,
            amount,
            balance: wallet.balance
          }
        });
      } else {
        // Revert wallet balance if gateway fails
        await wallet.addFunds(amount, 'REFUND');
        transaction.status = 'FAILED';
        transaction.failureReason = gatewayResponse.error;
        await transaction.save();
        
        res.status(400).json({
          success: false,
          message: 'Withdrawal failed',
          error: gatewayResponse.error
        });
      }
    } catch (error) {
      logger.error('Error processing withdrawal:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Get transaction history
  async getTransactions(req, res) {
    try {
      const { userId } = req.user;
      const { page = 1, limit = 20, type, status, startDate, endDate } = req.query;
      
      const cacheKey = `transactions:${userId}:${page}:${limit}:${type}:${status}:${startDate}:${endDate}`;
      
      // Try to get from cache first
      let transactions = await cacheGet(cacheKey);
      
      if (!transactions) {
        const query = { userId };
        
        if (type) query.type = type;
        if (status) query.status = status;
        if (startDate && endDate) {
          query.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          };
        }
        
        const skip = (page - 1) * limit;
        
        transactions = await Transaction.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .populate('metadata.tournamentId', 'name type')
          .populate('metadata.matchId', 'matchNumber');
        
        // Cache for 2 minutes
        await cacheSet(cacheKey, transactions, 120);
      }
      
      // Get total count
      const total = await Transaction.countDocuments({ userId });
      
      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Error getting transactions:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get transaction summary
  async getTransactionSummary(req, res) {
    try {
      const { userId } = req.user;
      const { startDate, endDate } = req.query;
      
      const cacheKey = `transaction_summary:${userId}:${startDate}:${endDate}`;
      
      // Try to get from cache first
      let summary = await cacheGet(cacheKey);
      
      if (!summary) {
        summary = await Transaction.getSummary(userId, startDate, endDate);
        
        // Cache for 5 minutes
        await cacheSet(cacheKey, summary, 300);
      }
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      logger.error('Error getting transaction summary:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Process payment gateway (simulated)
  async processPaymentGateway(paymentMethod, amount, userId) {
    // This is a simulation - in production, integrate with actual payment gateways
    logger.info(`Processing ${paymentMethod} payment for user ${userId}, amount: ${amount}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate success/failure (90% success rate)
    const isSuccess = Math.random() > 0.1;
    
    if (isSuccess) {
      return {
        success: true,
        transactionId: `GW_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'SUCCESS',
        message: 'Payment processed successfully'
      };
    } else {
      return {
        success: false,
        error: 'Payment gateway temporarily unavailable'
      };
    }
  }

  // Process withdrawal gateway (simulated)
  async processWithdrawalGateway(paymentMethod, amount, userId) {
    // This is a simulation - in production, integrate with actual payment gateways
    logger.info(`Processing ${paymentMethod} withdrawal for user ${userId}, amount: ${amount}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate success/failure (95% success rate)
    const isSuccess = Math.random() > 0.05;
    
    if (isSuccess) {
      return {
        success: true,
        transactionId: `GW_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'SUCCESS',
        message: 'Withdrawal processed successfully'
      };
    } else {
      return {
        success: false,
        error: 'Withdrawal gateway temporarily unavailable'
      };
    }
  }

  // Admin: Get all wallets
  async getAllWallets(req, res) {
    try {
      const { page = 1, limit = 20, search, status } = req.query;
      
      const query = {};
      if (search) {
        query.$or = [
          { 'userId.username': { $regex: search, $options: 'i' } },
          { 'userId.email': { $regex: search, $options: 'i' } }
        ];
      }
      if (status) query.verificationStatus = status;
      
      const skip = (page - 1) * limit;
      
      const wallets = await Wallet.find(query)
        .populate('userId', 'username email profile.displayName')
        .sort({ balance: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      const total = await Wallet.countDocuments(query);
      
      res.json({
        success: true,
        data: {
          wallets,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Error getting all wallets:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Admin: Update wallet verification status
  async updateVerificationStatus(req, res) {
    try {
      const { walletId } = req.params;
      const { verificationStatus, adminId } = req.body;
      
      const wallet = await Wallet.findById(walletId);
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }
      
      wallet.verificationStatus = verificationStatus;
      if (verificationStatus === 'VERIFIED') {
        wallet.kycDocuments.forEach(doc => {
          if (!doc.verifiedAt) {
            doc.verifiedAt = new Date();
            doc.verifiedBy = adminId;
          }
        });
      }
      
      await wallet.save();
      
      // Clear cache
      await cacheDelete(`wallet:${wallet.userId}`);
      
      res.json({
        success: true,
        message: 'Verification status updated successfully',
        data: wallet
      });
    } catch (error) {
      logger.error('Error updating verification status:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Admin: Suspend/unsuspend wallet
  async toggleWalletSuspension(req, res) {
    try {
      const { walletId } = req.params;
      const { isSuspended, suspensionReason, adminId } = req.body;
      
      const wallet = await Wallet.findById(walletId);
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }
      
      wallet.restrictions.isSuspended = isSuspended;
      wallet.restrictions.suspendedBy = adminId;
      
      if (isSuspended) {
        wallet.restrictions.suspensionReason = suspensionReason;
        wallet.restrictions.suspensionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      } else {
        wallet.restrictions.suspensionReason = undefined;
        wallet.restrictions.suspensionExpiresAt = undefined;
      }
      
      await wallet.save();
      
      // Clear cache
      await cacheDelete(`wallet:${wallet.userId}`);
      
      res.json({
        success: true,
        message: `Wallet ${isSuspended ? 'suspended' : 'unsuspended'} successfully`,
        data: wallet
      });
    } catch (error) {
      logger.error('Error toggling wallet suspension:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new PaymentController();
