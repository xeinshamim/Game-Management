import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { Card, Badge } from 'react-native-elements';
import { socialAPI } from '../../services/api';

interface LeaderboardEntry {
  _id: string;
  userId: {
    _id: string;
    username: string;
    displayName: string;
    profile?: {
      avatar?: string;
    };
  };
  gameType: string;
  rank: number;
  stats: {
    totalMatches: number;
    wins: number;
    winRate: number;
    totalPrizeMoney: number;
  };
  updatedAt: string;
}

const LeaderboardScreen: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGameType, setSelectedGameType] = useState<string>('all');
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<string>('all');

  const gameTypes = [
    { value: 'all', label: 'All Games' },
    { value: 'BR_MATCH', label: 'BR Match' },
    { value: 'CLASH_SQUAD', label: 'Clash Squad' },
    { value: 'LONE_WOLF', label: 'Lone Wolf' },
    { value: 'CS_2_VS_2', label: 'CS 2 vs 2' },
  ];

  const timeFrames = [
    { value: 'all', label: 'All Time' },
    { value: 'daily', label: 'Today' },
    { value: 'weekly', label: 'This Week' },
    { value: 'monthly', label: 'This Month' },
    { value: 'seasonal', label: 'This Season' },
  ];

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedGameType, selectedTimeFrame]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedGameType !== 'all') {
        params.gameType = selectedGameType;
      }
      if (selectedTimeFrame !== 'all') {
        params.timeFrame = selectedTimeFrame;
      }
      
      const response = await socialAPI.getLeaderboard(params);
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboard();
    setRefreshing(false);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return '#FFD700'; // Gold
      case 2:
        return '#C0C0C0'; // Silver
      case 3:
        return '#CD7F32'; // Bronze
      default:
        return '#666';
    }
  };

  const renderLeaderboardItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => (
    <Card containerStyle={styles.leaderboardCard}>
      <View style={styles.rankSection}>
        <Text style={[styles.rankText, { color: getRankColor(item.rank) }]}>
          {getRankIcon(item.rank)}
        </Text>
        <Text style={styles.rankNumber}>#{item.rank}</Text>
      </View>

      <View style={styles.playerSection}>
        <Image
          source={
            item.userId.profile?.avatar
              ? { uri: item.userId.profile.avatar }
              : { uri: `https://ui-avatars.com/api/?name=${item.userId.displayName}&background=random` }
          }
          style={styles.avatar}
        />
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{item.userId.displayName}</Text>
          <Text style={styles.playerUsername}>@{item.userId.username}</Text>
          <Text style={styles.gameType}>{item.gameType.replace('_', ' ')}</Text>
        </View>
      </View>

      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.stats.winRate.toFixed(1)}%</Text>
          <Text style={styles.statLabel}>Win Rate</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.stats.totalMatches}</Text>
          <Text style={styles.statLabel}>Matches</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>${item.stats.totalPrizeMoney.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Prize Money</Text>
        </View>
      </View>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading leaderboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        
        {/* Game Type Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Game Type:</Text>
          <FlatList
            horizontal
            data={gameTypes}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedGameType === item.value && styles.filterChipActive
                ]}
                onPress={() => setSelectedGameType(item.value)}
              >
                <Text style={[
                  styles.filterChipText,
                  selectedGameType === item.value && styles.filterChipTextActive
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.value}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
          />
        </View>

        {/* Time Frame Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Time Frame:</Text>
          <FlatList
            horizontal
            data={timeFrames}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedTimeFrame === item.value && styles.filterChipActive
                ]}
                onPress={() => setSelectedTimeFrame(item.value)}
              >
                <Text style={[
                  styles.filterChipText,
                  selectedTimeFrame === item.value && styles.filterChipTextActive
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.value}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
          />
        </View>
      </View>

      <FlatList
        data={leaderboard}
        renderItem={renderLeaderboardItem}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No leaderboard data available for the selected filters
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  filterList: {
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: 'white',
  },
  listContainer: {
    padding: 16,
  },
  leaderboardCard: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rankSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  rankText: {
    fontSize: 32,
    marginBottom: 4,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  playerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  playerUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  gameType: {
    fontSize: 12,
    color: '#888',
    textTransform: 'capitalize',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LeaderboardScreen;
