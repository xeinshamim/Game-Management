import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card, Button, Icon, Divider } from 'react-native-elements';
import { walletAPI } from '../../services/api';

interface Wallet {
  _id: string;
  userId: string;
  balance: number;
  currency: string;
  isVerified: boolean;
  isSuspended: boolean;
  dailyLimit: number;
  monthlyLimit: number;
  dailyUsed: number;
  monthlyUsed: number;
}

interface Transaction {
  _id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TOURNAMENT_ENTRY' | 'PRIZE_WIN' | 'REFUND';
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  description: string;
  createdAt: string;
  paymentMethod?: string;
  reference?: string;
}

const WalletScreen: React.FC = () => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setIsLoading(true);
      const [walletResponse, transactionsResponse] = await Promise.all([
        walletAPI.getBalance(),
        walletAPI.getTransactions({ limit: 20 }),
      ]);

      if (walletResponse.data.success) {
        setWallet(walletResponse.data.data);
      }

      if (transactionsResponse.data.success) {
        setTransactions(transactionsResponse.data.data);
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
      Alert.alert('Error', 'Failed to load wallet data');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWalletData();
    setRefreshing(false);
  };

  const handleDeposit = () => {
    Alert.alert('Deposit', 'Deposit functionality coming soon!');
  };

  const handleWithdraw = () => {
    if (!wallet?.isVerified) {
      Alert.alert('Verification Required', 'Please verify your account before making withdrawals.');
      return;
    }
    Alert.alert('Withdraw', 'Withdrawal functionality coming soon!');
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return 'arrow-down';
      case 'WITHDRAWAL': return 'arrow-up';
      case 'TOURNAMENT_ENTRY': return 'game-controller';
      case 'PRIZE_WIN': return 'trophy';
      case 'REFUND': return 'refresh';
      default: return 'swap-horizontal';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
      case 'PRIZE_WIN':
      case 'REFUND':
        return '#10b981';
      case 'WITHDRAWAL':
      case 'TOURNAMENT_ENTRY':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '#10b981';
      case 'PENDING': return '#f59e0b';
      case 'FAILED': return '#ef4444';
      case 'CANCELLED': return '#6b7280';
      default: return '#64748b';
    }
  };

  if (!wallet) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading wallet...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wallet</Text>
        <Text style={styles.headerSubtitle}>Manage your funds and transactions</Text>
      </View>

      {/* Balance Card */}
      <Card containerStyle={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <View style={styles.verificationBadge}>
            <Icon 
              name={wallet.isVerified ? 'checkmark-circle' : 'alert-circle'} 
              type="ionicon" 
              size={16} 
              color={wallet.isVerified ? '#10b981' : '#f59e0b'} 
            />
            <Text style={[styles.verificationText, { color: wallet.isVerified ? '#10b981' : '#f59e0b' }]}>
              {wallet.isVerified ? 'Verified' : 'Unverified'}
            </Text>
          </View>
        </View>
        
        <Text style={styles.balanceAmount}>
          {formatCurrency(wallet.balance, wallet.currency)}
        </Text>

        <View style={styles.limitInfo}>
          <Text style={styles.limitText}>
            Daily: {formatCurrency(wallet.dailyUsed, wallet.currency)} / {formatCurrency(wallet.dailyLimit, wallet.currency)}
          </Text>
          <Text style={styles.limitText}>
            Monthly: {formatCurrency(wallet.monthlyUsed, wallet.currency)} / {formatCurrency(wallet.monthlyLimit, wallet.currency)}
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <Button
            title="Deposit"
            icon={{ name: 'arrow-down', type: 'ionicon', size: 16, color: '#ffffff' }}
            buttonStyle={styles.depositButton}
            onPress={handleDeposit}
            containerStyle={styles.actionButtonContainer}
          />
          <Button
            title="Withdraw"
            icon={{ name: 'arrow-up', type: 'ionicon', size: 16, color: '#ffffff' }}
            buttonStyle={styles.withdrawButton}
            onPress={handleWithdraw}
            containerStyle={styles.actionButtonContainer}
            disabled={!wallet.isVerified}
          />
        </View>

        {wallet.isSuspended && (
          <View style={styles.suspendedWarning}>
            <Icon name="warning" type="ionicon" size={20} color="#ef4444" />
            <Text style={styles.suspendedText}>Wallet is currently suspended</Text>
          </View>
        )}
      </Card>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.quickActionButton}>
            <Icon name="card" type="ionicon" size={24} color="#6366f1" />
            <Text style={styles.quickActionText}>Payment Methods</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton}>
            <Icon name="settings" type="ionicon" size={24} color="#6366f1" />
            <Text style={styles.quickActionText}>Settings</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton}>
            <Icon name="help-circle" type="ionicon" size={24} color="#6366f1" />
            <Text style={styles.quickActionText}>Help</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton}>
            <Icon name="document-text" type="ionicon" size={24} color="#6366f1" />
            <Text style={styles.quickActionText}>Statement</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Transactions */}
      <View style={styles.transactionsSection}>
        <View style={styles.transactionsHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.transactionsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {transactions.length > 0 ? (
            transactions.map((transaction) => (
              <Card key={transaction._id} containerStyle={styles.transactionCard}>
                <View style={styles.transactionRow}>
                  <View style={styles.transactionIcon}>
                    <Icon 
                      name={getTransactionIcon(transaction.type)} 
                      type="ionicon" 
                      size={20} 
                      color={getTransactionColor(transaction.type)} 
                    />
                  </View>
                  
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionType}>{transaction.type.replace('_', ' ')}</Text>
                    <Text style={styles.transactionDescription} numberOfLines={1}>
                      {transaction.description}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {formatDate(transaction.createdAt)}
                    </Text>
                  </View>
                  
                  <View style={styles.transactionAmount}>
                    <Text style={[
                      styles.amountText, 
                      { color: getTransactionColor(transaction.type) }
                    ]}>
                      {transaction.type === 'WITHDRAWAL' || transaction.type === 'TOURNAMENT_ENTRY' ? '-' : '+'}
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status) }]}>
                      <Text style={styles.statusText}>{transaction.status}</Text>
                    </View>
                  </View>
                </View>
              </Card>
            ))
          ) : (
            <Card containerStyle={styles.emptyCard}>
              <Text style={styles.emptyText}>No transactions yet</Text>
            </Card>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  balanceCard: {
    borderRadius: 20,
    margin: 20,
    padding: 25,
    backgroundColor: '#6366f1',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  verificationText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
  },
  limitInfo: {
    marginBottom: 25,
  },
  limitText: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
    marginBottom: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButtonContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  depositButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 12,
  },
  withdrawButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 12,
  },
  suspendedWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 10,
    borderRadius: 10,
  },
  suspendedText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  quickActions: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 15,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f1f5f9',
    borderRadius: 15,
    marginBottom: 10,
  },
  quickActionText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    textAlign: 'center',
  },
  transactionsSection: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewAllText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
  },
  transactionsList: {
    flex: 1,
  },
  transactionCard: {
    borderRadius: 12,
    marginBottom: 10,
    padding: 15,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '500',
  },
  emptyCard: {
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
});

export default WalletScreen;
