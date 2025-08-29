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
import { Card, Button, Icon, Badge } from 'react-native-elements';
import { useAuth } from '../../context/AuthContext';
import { tournamentAPI, matchAPI } from '../../services/api';
import { useRealTime } from '../../hooks/useRealTime';
import { useNotificationSetup } from '../../hooks/useNotificationSetup';
import { useOffline } from '../../hooks/useOffline';

interface Tournament {
  _id: string;
  name: string;
  type: string;
  startTime: string;
  endTime: string;
  prizePool: {
    first: number;
    second: number;
    third: number;
  };
  participantCount: number;
  maxParticipants: number;
  status: string;
}

interface Match {
  _id: string;
  matchNumber: number;
  matchType: string;
  scheduledTime: string;
  status: string;
  participants: any[];
  maxParticipants: number;
}

const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const [upcomingTournaments, setUpcomingTournaments] = useState<Tournament[]>([]);
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Real-time features
  const {
    isConnected,
    connectionStatus,
    matchUpdates,
    tournamentUpdates,
    socialUpdates,
    getUpdateCount,
    clearUpdates,
  } = useRealTime();
  
  // Notification setup
  const {
    notificationPermission,
    isInitialized,
    showTestNotification,
    scheduleTestReminder,
  } = useNotificationSetup();

  // Offline functionality
  const {
    isOnline,
    isOffline,
    connectionType,
    cacheStats,
    syncStats,
    getConnectionQuality,
  } = useOffline();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [tournamentsResponse, matchesResponse] = await Promise.all([
        tournamentAPI.getUpcoming(),
        matchAPI.getLive(),
      ]);

      if (tournamentsResponse.data.success) {
        setUpcomingTournaments(tournamentsResponse.data.data.slice(0, 3));
      }

      if (matchesResponse.data.success) {
        setLiveMatches(matchesResponse.data.data.slice(0, 3));
      }
    } catch (error) {
      console.error('Error loading home data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LIVE': return '#ef4444';
      case 'UPCOMING': return '#10b981';
      case 'COMPLETED': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getConnectionQualityColor = () => {
    const quality = getConnectionQuality();
    switch (quality) {
      case 'excellent':
        return '#10b981';
      case 'good':
        return '#f59e0b';
      case 'poor':
        return '#ef4444';
      case 'offline':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.userName}>{user?.profile.displayName || user?.username}</Text>
        
        {/* Connection Status Section */}
        <View style={styles.connectionSection}>
          {/* Real-time Connection Status */}
          <View style={styles.connectionStatus}>
            <View style={[styles.statusDot, { backgroundColor: isConnected ? '#10b981' : '#ef4444' }]} />
            <Text style={styles.statusText}>
              Real-time: {isConnected ? 'Connected' : 'Disconnected'} ({connectionStatus})
            </Text>
          </View>

          {/* Offline Status */}
          <View style={styles.connectionStatus}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#10b981' : '#ef4444' }]} />
            <Text style={styles.statusText}>
              Network: {isOnline ? 'Online' : 'Offline'} ({connectionType || 'Unknown'})
            </Text>
          </View>

          {/* Connection Quality */}
          <View style={styles.connectionStatus}>
            <View style={[styles.statusDot, { backgroundColor: getConnectionQualityColor() }]} />
            <Text style={styles.statusText}>
              Quality: {getConnectionQuality().charAt(0).toUpperCase() + getConnectionQuality().slice(1)}
            </Text>
          </View>
        </View>
      </View>

      {/* Offline Status Summary */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Icon name="wifi-off" type="feather" size={20} color="#ffffff" />
          <Text style={styles.offlineText}>
            You're currently offline. Some features may be limited.
          </Text>
        </View>
      )}

      {/* Real-time Updates Summary */}
      <View style={styles.realTimeSection}>
        <Text style={styles.sectionTitle}>Real-time Updates</Text>
        <View style={styles.updateCounts}>
          <View style={styles.updateCount}>
            <Badge value={getUpdateCount('match')} status="primary" />
            <Text style={styles.updateLabel}>Matches</Text>
          </View>
          <View style={styles.updateCount}>
            <Badge value={getUpdateCount('tournament')} status="success" />
            <Text style={styles.updateLabel}>Tournaments</Text>
          </View>
          <View style={styles.updateCount}>
            <Badge value={getUpdateCount('social')} status="warning" />
            <Text style={styles.updateLabel}>Social</Text>
          </View>
        </View>
        <Button
          title="Clear All Updates"
          type="outline"
          buttonStyle={styles.clearButton}
          onPress={() => clearUpdates('all')}
        />
      </View>

      {/* Offline Cache Summary */}
      <View style={styles.offlineSection}>
        <Text style={styles.sectionTitle}>Offline Cache</Text>
        <View style={styles.cacheStats}>
          <View style={styles.cacheStat}>
            <Badge value={cacheStats.totalItems} status="info" />
            <Text style={styles.cacheLabel}>Cached Items</Text>
          </View>
          <View style={styles.cacheStat}>
            <Badge value={syncStats.pendingItems} status="warning" />
            <Text style={styles.cacheLabel}>Pending Sync</Text>
          </View>
        </View>
      </View>

      {/* Notification Test Section */}
      {isInitialized && (
        <View style={styles.notificationSection}>
          <Text style={styles.sectionTitle}>Notification Test</Text>
          <View style={styles.notificationButtons}>
            <Button
              title="Test Notification"
              type="outline"
              buttonStyle={styles.testButton}
              onPress={showTestNotification}
              disabled={!notificationPermission}
            />
            <Button
              title="Test Reminder (10s)"
              type="outline"
              buttonStyle={styles.testButton}
              onPress={scheduleTestReminder}
              disabled={!notificationPermission}
            />
          </View>
          <Text style={styles.permissionStatus}>
            Notifications: {notificationPermission ? '✅ Enabled' : '❌ Disabled'}
          </Text>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="game-controller" type="ionicon" size={24} color="#6366f1" />
            <Text style={styles.actionButtonText}>Join Match</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="trophy" type="ionicon" size={24} color="#6366f1" />
            <Text style={styles.actionButtonText}>Tournaments</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="wallet" type="ionicon" size={24} color="#6366f1" />
            <Text style={styles.actionButtonText}>Wallet</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="people" type="ionicon" size={24} color="#6366f1" />
            <Text style={styles.actionButtonText}>Friends</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Live Matches */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Live Matches</Text>
        {liveMatches.length > 0 ? (
          liveMatches.map((match) => (
            <Card key={match._id} containerStyle={styles.matchCard}>
              <View style={styles.matchHeader}>
                <Text style={styles.matchType}>{match.matchType}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(match.status) }]}>
                  <Text style={styles.statusText}>{match.status}</Text>
                </View>
              </View>
              
              <Text style={styles.matchNumber}>Match #{match.matchNumber}</Text>
              <Text style={styles.matchTime}>
                {formatTime(match.scheduledTime)}
              </Text>
              
              <View style={styles.matchStats}>
                <Text style={styles.matchStatsText}>
                  {match.participants.length}/{match.maxParticipants} Players
                </Text>
              </View>
              
              <Button
                title="Join Match"
                type="outline"
                buttonStyle={styles.joinButton}
                titleStyle={styles.joinButtonText}
                onPress={() => Alert.alert('Join Match', 'Feature coming soon!')}
              />
            </Card>
          ))
        ) : (
          <Card containerStyle={styles.emptyCard}>
            <Text style={styles.emptyText}>No live matches at the moment</Text>
          </Card>
        )}
      </View>

      {/* Upcoming Tournaments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Tournaments</Text>
        {upcomingTournaments.length > 0 ? (
          upcomingTournaments.map((tournament) => (
            <Card key={tournament._id} containerStyle={styles.tournamentCard}>
              <Text style={styles.tournamentName}>{tournament.name}</Text>
              <Text style={styles.tournamentType}>{tournament.type}</Text>
              
              <View style={styles.tournamentInfo}>
                <View style={styles.infoRow}>
                  <Icon name="time" type="ionicon" size={16} color="#64748b" />
                  <Text style={styles.infoText}>
                    {formatTime(tournament.startTime)}
                  </Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Icon name="people" type="ionicon" size={16} color="#64748b" />
                  <Text style={styles.infoText}>
                    {tournament.participantCount}/{tournament.maxParticipants} Players
                  </Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Icon name="trophy" type="ionicon" size={16} color="#64748b" />
                  <Text style={styles.infoText}>
                    Prize Pool: ${tournament.prizePool.first + tournament.prizePool.second + tournament.prizePool.third}
                  </Text>
                </View>
              </View>
              
              <Button
                title="Register"
                type="outline"
                buttonStyle={styles.registerButton}
                titleStyle={styles.registerButtonText}
                onPress={() => Alert.alert('Register', 'Feature coming soon!')}
              />
            </Card>
          ))
        ) : (
          <Card containerStyle={styles.emptyCard}>
            <Text style={styles.emptyText}>No upcoming tournaments</Text>
          </Card>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#ffffff',
  },
  welcomeText: {
    fontSize: 16,
    color: '#64748b',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
  },
  connectionSection: {
    marginTop: 15,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
  },
  offlineText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  realTimeSection: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  updateCounts: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  updateCount: {
    alignItems: 'center',
  },
  updateLabel: {
    marginTop: 5,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  clearButton: {
    borderColor: '#ef4444',
    borderRadius: 8,
  },
  offlineSection: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  cacheStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  cacheStat: {
    alignItems: 'center',
  },
  cacheLabel: {
    marginTop: 5,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  notificationSection: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  notificationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  testButton: {
    borderColor: '#6366f1',
    borderRadius: 8,
    minWidth: 120,
  },
  permissionStatus: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    minWidth: 80,
  },
  actionButtonText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
    textAlign: 'center',
  },
  section: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  matchCard: {
    borderRadius: 12,
    marginBottom: 15,
    padding: 15,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  matchType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchNumber: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 5,
  },
  matchTime: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 10,
  },
  matchStats: {
    marginBottom: 15,
  },
  matchStatsText: {
    fontSize: 14,
    color: '#475569',
  },
  joinButton: {
    borderColor: '#6366f1',
    borderRadius: 8,
  },
  joinButtonText: {
    color: '#6366f1',
  },
  tournamentCard: {
    borderRadius: 12,
    marginBottom: 15,
    padding: 15,
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 5,
  },
  tournamentType: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 15,
  },
  tournamentInfo: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#475569',
  },
  registerButton: {
    borderColor: '#10b981',
    borderRadius: 8,
  },
  registerButtonText: {
    color: '#10b981',
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

export default HomeScreen;
