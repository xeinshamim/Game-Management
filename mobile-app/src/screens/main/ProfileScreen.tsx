import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Card, Button, Icon, Avatar } from 'react-native-elements';
import { useAuth } from '../../context/AuthContext';
import { socialAPI } from '../../services/api';

interface UserStats {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPrizeMoney: number;
  tournamentsJoined: number;
  tournamentsWon: number;
  rank: number;
}

const ProfileScreen: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadUserStats();
  }, []);

  const loadUserStats = async () => {
    try {
      setIsLoading(true);
      const response = await socialAPI.getLeaderboard({ userId: user?.userId });
      
      if (response.data.success && response.data.data.length > 0) {
        const userStats = response.data.data[0];
        setStats({
          totalMatches: userStats.totalMatches || 0,
          wins: userStats.wins || 0,
          losses: userStats.losses || 0,
          winRate: userStats.winRate || 0,
          totalPrizeMoney: userStats.totalPrizeMoney || 0,
          tournamentsJoined: userStats.tournamentsJoined || 0,
          tournamentsWon: userStats.tournamentsWon || 0,
          rank: userStats.rank || 0,
        });
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing functionality coming soon!');
  };

  const handleChangePassword = () => {
    Alert.alert('Change Password', 'Password change functionality coming soon!');
  };

  const handleNotifications = () => {
    Alert.alert('Notifications', 'Notification settings coming soon!');
  };

  const handlePrivacy = () => {
    Alert.alert('Privacy', 'Privacy settings coming soon!');
  };

  const handleSupport = () => {
    Alert.alert('Support', 'Support functionality coming soon!');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const StatCard = ({ title, value, icon, color }: { title: string; value: string | number; icon: string; color: string }) => (
    <View style={styles.statCard}>
      <Icon name={icon} type="ionicon" size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.headerSubtitle}>Your gaming journey</Text>
      </View>

      {/* Profile Card */}
      <Card containerStyle={styles.profileCard}>
        <View style={styles.profileHeader}>
          <Avatar
            size="large"
            rounded
            source={user.profile.avatar ? { uri: user.profile.avatar } : undefined}
            icon={{ name: 'person', type: 'ionicon', color: '#6366f1' }}
            containerStyle={styles.avatarContainer}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>{user.profile.displayName}</Text>
            <Text style={styles.username}>@{user.username}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <View style={styles.roleBadge}>
              <Icon name="shield-checkmark" type="ionicon" size={14} color="#10b981" />
              <Text style={styles.roleText}>{user.role}</Text>
            </View>
          </View>
        </View>

        <Button
          title="Edit Profile"
          type="outline"
          buttonStyle={styles.editButton}
          titleStyle={styles.editButtonText}
          onPress={handleEditProfile}
          containerStyle={styles.editButtonContainer}
        />
      </Card>

      {/* Statistics */}
      {stats && (
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Matches"
              value={stats.totalMatches}
              icon="game-controller"
              color="#6366f1"
            />
            <StatCard
              title="Win Rate"
              value={`${stats.winRate}%`}
              icon="trophy"
              color="#10b981"
            />
            <StatCard
              title="Tournaments"
              value={stats.tournamentsJoined}
              icon="medal"
              color="#f59e0b"
            />
            <StatCard
              title="Prize Money"
              value={formatCurrency(stats.totalPrizeMoney)}
              icon="cash"
              color="#8b5cf6"
            />
          </View>

          <View style={styles.detailedStats}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Wins</Text>
              <Text style={styles.statValue}>{stats.wins}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Losses</Text>
              <Text style={styles.statValue}>{stats.losses}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Tournaments Won</Text>
              <Text style={styles.statValue}>{stats.tournamentsWon}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Global Rank</Text>
              <Text style={styles.statValue}>#{stats.rank}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Settings */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <TouchableOpacity style={styles.settingItem} onPress={handleChangePassword}>
          <Icon name="lock-closed" type="ionicon" size={20} color="#6366f1" />
          <Text style={styles.settingText}>Change Password</Text>
          <Icon name="chevron-forward" type="ionicon" size={20} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={handleNotifications}>
          <Icon name="notifications" type="ionicon" size={20} color="#6366f1" />
          <Text style={styles.settingText}>Notifications</Text>
          <Icon name="chevron-forward" type="ionicon" size={20} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={handlePrivacy}>
          <Icon name="shield" type="ionicon" size={20} color="#6366f1" />
          <Text style={styles.settingText}>Privacy & Security</Text>
          <Icon name="chevron-forward" type="ionicon" size={20} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={handleSupport}>
          <Icon name="help-circle" type="ionicon" size={20} color="#6366f1" />
          <Text style={styles.settingText}>Help & Support</Text>
          <Icon name="chevron-forward" type="ionicon" size={20} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <Button
          title="Logout"
          type="outline"
          buttonStyle={styles.logoutButton}
          titleStyle={styles.logoutButtonText}
          onPress={handleLogout}
          containerStyle={styles.logoutButtonContainer}
        />
      </View>

      {/* App Version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>Gaming Tournament v1.0.0</Text>
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
  profileCard: {
    borderRadius: 20,
    margin: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    backgroundColor: '#f1f5f9',
    marginRight: 20,
  },
  profileInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 5,
  },
  username: {
    fontSize: 16,
    color: '#6366f1',
    marginBottom: 5,
  },
  email: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 10,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
    marginLeft: 5,
    textTransform: 'capitalize',
  },
  editButton: {
    borderColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 12,
  },
  editButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
  editButtonContainer: {
    marginTop: 10,
  },
  statsSection: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 15,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 10,
    marginBottom: 5,
  },
  statTitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  detailedStats: {
    backgroundColor: '#f8fafc',
    borderRadius: 15,
    padding: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  statLabel: {
    fontSize: 14,
    color: '#475569',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  settingsSection: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    marginLeft: 15,
  },
  logoutSection: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  logoutButton: {
    borderColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 12,
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButtonContainer: {
    marginTop: 10,
  },
  versionContainer: {
    padding: 20,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#94a3b8',
  },
});

export default ProfileScreen;
