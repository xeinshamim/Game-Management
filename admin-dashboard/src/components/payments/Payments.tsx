import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, CheckCircle, XCircle, AlertTriangle, DollarSign, CreditCard, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../../services/api';

interface Transaction {
  _id: string;
  userId: string;
  username: string;
  type: 'deposit' | 'withdrawal' | 'tournament_entry' | 'prize_payout' | 'refund';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethod: 'bkash' | 'nagad' | 'wallet' | 'system';
  reference: string;
  description: string;
  metadata?: {
    tournamentId?: string;
    tournamentName?: string;
    matchId?: string;
    matchName?: string;
    reason?: string;
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface Wallet {
  _id: string;
  userId: string;
  username: string;
  balance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  isVerified: boolean;
  dailyLimit: number;
  monthlyLimit: number;
  dailyUsed: number;
  monthlyUsed: number;
  status: 'active' | 'suspended' | 'frozen';
  kycStatus: 'pending' | 'approved' | 'rejected';
  lastActivity: string;
}

const Payments: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'transactions' | 'wallets'>('transactions');

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    } else {
      fetchWallets();
    }
  }, [activeTab]);

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/payments/transactions');
      setTransactions(response.data);
    } catch (error) {
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchWallets = async () => {
    try {
      const response = await api.get('/payments/wallets');
      setWallets(response.data);
    } catch (error) {
      toast.error('Failed to fetch wallets');
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionStatusUpdate = async (transactionId: string, newStatus: string) => {
    try {
      await api.put(`/payments/transactions/${transactionId}/status`, { status: newStatus });
      toast.success(`Transaction status updated to ${newStatus}`);
      fetchTransactions();
    } catch (error) {
      toast.error('Failed to update transaction status');
    }
  };

  const handleWalletStatusUpdate = async (walletId: string, newStatus: string) => {
    try {
      await api.put(`/payments/wallets/${walletId}/status`, { status: newStatus });
      toast.success(`Wallet status updated to ${newStatus}`);
      fetchWallets();
    } catch (error) {
      toast.error('Failed to update wallet status');
    }
  };

  const handleKYCApproval = async (walletId: string, status: string) => {
    try {
      await api.put(`/payments/wallets/${walletId}/kyc`, { status });
      toast.success(`KYC status updated to ${status}`);
      fetchWallets();
    } catch (error) {
      toast.error('Failed to update KYC status');
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'deposit': return 'bg-green-100 text-green-800';
      case 'withdrawal': return 'bg-red-100 text-red-800';
      case 'tournament_entry': return 'bg-blue-100 text-blue-800';
      case 'prize_payout': return 'bg-purple-100 text-purple-800';
      case 'refund': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'bkash': return 'bg-blue-100 text-blue-800';
      case 'nagad': return 'bg-green-100 text-green-800';
      case 'wallet': return 'bg-purple-100 text-purple-800';
      case 'system': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getWalletStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      case 'frozen': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getKYCColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || transaction.type === filterType;
    const matchesStatus = filterStatus === 'all' || transaction.status === filterStatus;
    const matchesPaymentMethod = filterPaymentMethod === 'all' || transaction.paymentMethod === filterPaymentMethod;
    
    return matchesSearch && matchesType && matchesStatus && matchesPaymentMethod;
  });

  const filteredWallets = wallets.filter(wallet => {
    const matchesSearch = wallet.username.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getTotalStats = () => {
    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const pendingTransactions = transactions.filter(t => t.status === 'pending').length;
    const totalWallets = wallets.length;
    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

    return { totalTransactions, totalAmount, pendingTransactions, totalWallets, totalBalance };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = getTotalStats();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
        <div className="text-sm text-gray-600">
          {activeTab === 'transactions' ? 
            `Total: ${stats.totalTransactions} | Pending: ${stats.pendingTransactions}` :
            `Total Wallets: ${stats.totalWallets} | Total Balance: $${stats.totalBalance.toFixed(2)}`
          }
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">${stats.totalAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingTransactions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Wallet className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Balance</p>
              <p className="text-2xl font-bold text-gray-900">${stats.totalBalance.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'transactions'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => setActiveTab('wallets')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'wallets'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Wallets
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Filters */}
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={activeTab === 'transactions' ? "Search transactions..." : "Search wallets..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              
              {activeTab === 'transactions' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">All Types</option>
                      <option value="deposit">Deposit</option>
                      <option value="withdrawal">Withdrawal</option>
                      <option value="tournament_entry">Tournament Entry</option>
                      <option value="prize_payout">Prize Payout</option>
                      <option value="refund">Refund</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <select
                      value={filterPaymentMethod}
                      onChange={(e) => setFilterPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">All Methods</option>
                      <option value="bkash">bKash</option>
                      <option value="nagad">Nagad</option>
                      <option value="wallet">Wallet</option>
                      <option value="system">System</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <div key={transaction._id} className="bg-gray-50 rounded-lg p-4 border">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTransactionTypeColor(transaction.type)}`}>
                          {transaction.type.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                          {transaction.status}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentMethodColor(transaction.paymentMethod)}`}>
                          {transaction.paymentMethod}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">User:</span> {transaction.username}
                        </div>
                        <div>
                          <span className="font-medium">Amount:</span> ${transaction.amount}
                        </div>
                        <div>
                          <span className="font-medium">Reference:</span> {transaction.reference}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span> {new Date(transaction.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        {transaction.description}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => {
                          setSelectedTransaction(transaction);
                          setShowTransactionModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      {transaction.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleTransactionStatusUpdate(transaction._id, 'completed')}
                            className="text-green-600 hover:text-green-900"
                            title="Mark Completed"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => handleTransactionStatusUpdate(transaction._id, 'failed')}
                            className="text-red-600 hover:text-red-900"
                            title="Mark Failed"
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Wallets Tab */}
          {activeTab === 'wallets' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWallets.map((wallet) => (
                <div key={wallet._id} className="bg-gray-50 rounded-lg p-4 border">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{wallet.username}</h3>
                      <p className="text-sm text-gray-600">Balance: ${wallet.balance.toFixed(2)}</p>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getWalletStatusColor(wallet.status)}`}>
                        {wallet.status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getKYCColor(wallet.kycStatus)}`}>
                        KYC: {wallet.kycStatus}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between">
                      <span>Total Deposits:</span>
                      <span className="font-medium">${wallet.totalDeposits.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Withdrawals:</span>
                      <span className="font-medium">${wallet.totalWithdrawals.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Daily Used:</span>
                      <span className="font-medium">${wallet.dailyUsed.toFixed(2)} / ${wallet.dailyLimit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Monthly Used:</span>
                      <span className="font-medium">${wallet.monthlyUsed.toFixed(2)} / ${wallet.monthlyLimit.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedWallet(wallet);
                        setShowWalletModal(true);
                      }}
                      className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded-md text-sm hover:bg-blue-200"
                    >
                      Details
                    </button>
                    {wallet.status === 'active' ? (
                      <button
                        onClick={() => handleWalletStatusUpdate(wallet._id, 'suspended')}
                        className="flex-1 bg-yellow-100 text-yellow-700 px-3 py-2 rounded-md text-sm hover:bg-yellow-200"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        onClick={() => handleWalletStatusUpdate(wallet._id, 'active')}
                        className="flex-1 bg-green-100 text-green-700 px-3 py-2 rounded-md text-sm hover:bg-green-200"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Details Modal */}
      {showTransactionModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Transaction Details</h2>
              <button
                onClick={() => setShowTransactionModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">User</label>
                  <p className="text-sm text-gray-900">{selectedTransaction.username}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getTransactionTypeColor(selectedTransaction.type)}`}>
                    {selectedTransaction.type.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount</label>
                  <p className="text-lg font-bold text-gray-900">${selectedTransaction.amount}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTransaction.status)}`}>
                    {selectedTransaction.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPaymentMethodColor(selectedTransaction.paymentMethod)}`}>
                    {selectedTransaction.paymentMethod}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reference</label>
                  <p className="text-sm text-gray-900">{selectedTransaction.reference}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="text-sm text-gray-900">{selectedTransaction.description}</p>
              </div>

              {selectedTransaction.metadata && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Additional Information</label>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    {selectedTransaction.metadata.tournamentName && (
                      <p><span className="font-medium">Tournament:</span> {selectedTransaction.metadata.tournamentName}</p>
                    )}
                    {selectedTransaction.metadata.matchName && (
                      <p><span className="font-medium">Match:</span> {selectedTransaction.metadata.matchName}</p>
                    )}
                    {selectedTransaction.metadata.reason && (
                      <p><span className="font-medium">Reason:</span> {selectedTransaction.metadata.reason}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="text-sm text-gray-900">{new Date(selectedTransaction.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Updated</label>
                  <p className="text-sm text-gray-900">{new Date(selectedTransaction.updatedAt).toLocaleString()}</p>
                </div>
              </div>

              {selectedTransaction.status === 'pending' && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => handleTransactionStatusUpdate(selectedTransaction._id, 'completed')}
                    className="flex-1 bg-green-100 text-green-700 py-2 px-4 rounded-md hover:bg-green-200"
                  >
                    Mark Completed
                  </button>
                  <button
                    onClick={() => handleTransactionStatusUpdate(selectedTransaction._id, 'failed')}
                    className="flex-1 bg-red-100 text-red-700 py-2 px-4 rounded-md hover:bg-red-200"
                  >
                    Mark Failed
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowTransactionModal(false)}
                className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Details Modal */}
      {showWalletModal && selectedWallet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Wallet Details</h2>
              <button
                onClick={() => setShowWalletModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <p className="text-sm text-gray-900">{selectedWallet.username}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getWalletStatusColor(selectedWallet.status)}`}>
                    {selectedWallet.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Balance</label>
                  <p className="text-lg font-bold text-green-600">${selectedWallet.balance.toFixed(2)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">KYC Status</label>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getKYCColor(selectedWallet.kycStatus)}`}>
                    {selectedWallet.kycStatus}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Financial Summary</label>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Total Deposits:</span>
                      <p className="text-lg font-bold text-blue-600">${selectedWallet.totalDeposits.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="font-medium">Total Withdrawals:</span>
                      <p className="text-lg font-bold text-red-600">${selectedWallet.totalWithdrawals.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Limits & Usage</label>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Daily Limit:</span>
                      <span>${selectedWallet.dailyLimit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Daily Used:</span>
                      <span className={selectedWallet.dailyUsed > selectedWallet.dailyLimit * 0.8 ? 'text-red-600' : 'text-gray-900'}>
                        ${selectedWallet.dailyUsed.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Monthly Limit:</span>
                      <span>${selectedWallet.monthlyLimit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Monthly Used:</span>
                      <span className={selectedWallet.monthlyUsed > selectedWallet.monthlyLimit * 0.8 ? 'text-red-600' : 'text-gray-900'}>
                        ${selectedWallet.monthlyUsed.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Last Activity</label>
                <p className="text-sm text-gray-900">{new Date(selectedWallet.lastActivity).toLocaleString()}</p>
              </div>

              <div className="flex gap-3 pt-4">
                {selectedWallet.status === 'active' ? (
                  <button
                    onClick={() => handleWalletStatusUpdate(selectedWallet._id, 'suspended')}
                    className="flex-1 bg-yellow-100 text-yellow-700 py-2 px-4 rounded-md hover:bg-yellow-200"
                  >
                    Suspend Wallet
                  </button>
                ) : (
                  <button
                    onClick={() => handleWalletStatusUpdate(selectedWallet._id, 'active')}
                    className="flex-1 bg-green-100 text-green-700 py-2 px-4 rounded-md hover:bg-green-200"
                  >
                    Activate Wallet
                  </button>
                )}

                {selectedWallet.kycStatus === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleKYCApproval(selectedWallet._id, 'approved')}
                      className="px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200"
                    >
                      Approve KYC
                    </button>
                    <button
                      onClick={() => handleKYCApproval(selectedWallet._id, 'rejected')}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                    >
                      Reject KYC
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowWalletModal(false)}
                className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
