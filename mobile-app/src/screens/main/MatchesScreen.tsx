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
import { Card, Button, Icon, SearchBar } from 'react-native-elements';
import { matchAPI } from '../../services/api';

interface Match {
  _id: string;
  matchNumber: number;
  matchType: string;
  tournamentId?: string;
  tournamentName?: string;
  scheduledTime: string;
  startTime?: string;
  endTime?: string;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  participants: Array<{
    userId: string;
    username: string;
    displayName: string;
    score?: number;
    rank?: number;
  }>;
  maxParticipants: number;
  results?: Array<{
    userId: string;
    username: string;
    displayName: string;
    score: number;
    rank: number;
    prizeAmount?: number;
  }>;
  entryFee: number;
  prizePool: {
    first: number;
    second: number;
    third: number;
  };
}

const MatchesScreen: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  useEffect(() => {
    loadMatches();
  }, []);

  useEffect(() => {
    filterMatches();
  }, [matches, searchQuery, selectedFilter]);

  const loadMatches = async () => {
    try {
      setIsLoading(true);
      const response = await matchAPI.getAll();
      
      if (response.data.success) {
        setMatches(response.data.data);
      }
    } catch (error) {
      console.error('Error loading matches:', error);
      Alert.alert('Error', 'Failed to load matches');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMatches();
    setRefreshing(false);
  };

  const filterMatches = () => {
    let filtered = matches;

    // Apply status filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(m => m.status === selectedFilter);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(m => 
        m.matchType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.tournamentName && m.tournamentName.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredMatches(filtered);
  };

  const handleJoinMatch = async (matchId: string) => {
    try {
      const response = await matchAPI.join(matchId);
      if (response.data.success) {
        Alert.alert('Success', 'Successfully joined the match!');
        loadMatches(); // Refresh to update participant count
      }
    } catch (error: any) {
      Alert.alert('Join Failed', error.response?.data?.message || 'Failed to join match');
    }
  };

  const handleLeaveMatch = async (matchId: string) => {
    try {
      const response = await matchAPI.leave(matchId);
      if (response.data.success) {
        Alert.alert('Success', 'Successfully left the match!');
        loadMatches(); // Refresh to update participant count
      }
    } catch (error: any) {
      Alert.alert('Leave Failed', error.response?.data?.message || 'Failed to leave match');
    }
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UPCOMING': return '#10b981';
      case 'LIVE': return '#ef4444';
      case 'COMPLETED': return '#6b7280';
      case 'CANCELLED': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'UPCOMING': return 'Upcoming';
      case 'LIVE': return 'Live';
      case 'COMPLETED': return 'Completed';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  };

  const isUserParticipant = (match: Match) => {
    // This would need to be implemented based on your user context
    // For now, we'll show all matches as available
    return false;
  };

  const FilterButton = ({ title, filter, isActive }: { title: string; filter: string; isActive: boolean }) => (
    <TouchableOpacity
      style={[styles.filterButton, isActive && styles.filterButtonActive]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Matches</Text>
        <Text style={styles.headerSubtitle}>Join and compete in matches</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          placeholder="Search matches..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          platform="default"
          containerStyle={styles.searchBarContainer}
          inputContainerStyle={styles.searchInputContainer}
        />
      </View>

      {/* Filter Buttons */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <FilterButton title="All" filter="all" isActive={selectedFilter === 'all'} />
        <FilterButton title="Upcoming" filter="UPCOMING" isActive={selectedFilter === 'UPCOMING'} />
        <FilterButton title="Live" filter="LIVE" isActive={selectedFilter === 'LIVE'} />
        <FilterButton title="Completed" filter="COMPLETED" isActive={selectedFilter === 'COMPLETED'} />
      </ScrollView>

      {/* Matches List */}
      <ScrollView
        style={styles.matchesList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredMatches.length > 0 ? (
          filteredMatches.map((match) => (
            <Card key={match._id} containerStyle={styles.matchCard}>
              <View style={styles.matchHeader}>
                <View style={styles.matchInfo}>
                  <Text style={styles.matchType}>{match.matchType}</Text>
                  <Text style={styles.matchNumber}>Match #{match.matchNumber}</Text>
                  {match.tournamentName && (
                    <Text style={styles.tournamentName}>{match.tournamentName}</Text>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(match.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(match.status)}</Text>
                </View>
              </View>

              <View style={styles.matchDetails}>
                <View style={styles.detailRow}>
                  <Icon name="time" type="ionicon" size={16} color="#64748b" />
                  <Text style={styles.detailText}>
                    {match.status === 'LIVE' ? 'Started' : 'Scheduled'}: {formatTime(match.scheduledTime)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Icon name="people" type="ionicon" size={16} color="#64748b" />
                  <Text style={styles.detailText}>
                    {match.participants.length}/{match.maxParticipants} Players
                  </Text>
                </View>

                {match.entryFee > 0 && (
                  <View style={styles.detailRow}>
                    <Icon name="card" type="ionicon" size={16} color="#64748b" />
                    <Text style={styles.detailText}>
                      Entry Fee: ${match.entryFee}
                    </Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Icon name="trophy" type="ionicon" size={16} color="#64748b" />
                  <Text style={styles.detailText}>
                    Prize Pool: ${match.prizePool.first + match.prizePool.second + match.prizePool.third}
                  </Text>
                </View>
              </View>

              {/* Results for completed matches */}
              {match.status === 'COMPLETED' && match.results && (
                <View style={styles.resultsSection}>
                  <Text style={styles.resultsTitle}>Results</Text>
                  {match.results.slice(0, 3).map((result, index) => (
                    <View key={result.userId} style={styles.resultRow}>
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>#{result.rank}</Text>
                      </View>
                      <Text style={styles.resultUsername}>{result.displayName}</Text>
                      <Text style={styles.resultScore}>{result.score} pts</Text>
                      {result.prizeAmount && (
                        <Text style={styles.prizeAmount}>${result.prizeAmount}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Action Buttons */}
              {match.status === 'UPCOMING' && (
                <View style={styles.actionButtons}>
                  {isUserParticipant(match) ? (
                    <Button
                      title="Leave Match"
                      type="outline"
                      buttonStyle={styles.leaveButton}
                      titleStyle={styles.leaveButtonText}
                      onPress={() => handleLeaveMatch(match._id)}
                    />
                  ) : (
                    <Button
                      title="Join Match"
                      type="outline"
                      buttonStyle={styles.joinButton}
                      titleStyle={styles.joinButtonText}
                      onPress={() => handleJoinMatch(match._id)}
                      disabled={match.participants.length >= match.maxParticipants}
                    />
                  )}
                </View>
              )}

              {match.participants.length >= match.maxParticipants && match.status === 'UPCOMING' && (
                <Text style={styles.fullText}>Match is full</Text>
              )}

              {match.status === 'LIVE' && (
                <View style={styles.liveIndicator}>
                  <Icon name="radio-button-on" type="ionicon" size={16} color="#ef4444" />
                  <Text style={styles.liveText}>Match in progress</Text>
                </View>
              )}
            </Card>
          ))
        ) : (
          <Card containerStyle={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {searchQuery || selectedFilter !== 'all' 
                ? 'No matches match your criteria' 
                : 'No matches available at the moment'}
            </Text>
          </Card>
        )}
      </ScrollView>
    </View>
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchBarContainer: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  searchInputContainer: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  matchesList: {
    flex: 1,
    padding: 20,
  },
  matchCard: {
    borderRadius: 15,
    marginBottom: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  matchInfo: {
    flex: 1,
  },
  matchType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 5,
  },
  matchNumber: {
    fontSize: 14,
    color: '#6366f1',
    marginBottom: 5,
  },
  tournamentName: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  matchDetails: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#475569',
  },
  resultsSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 10,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  rankBadge: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 10,
    minWidth: 30,
    alignItems: 'center',
  },
  rankText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  resultUsername: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    marginLeft: 10,
  },
  resultScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
    marginRight: 10,
  },
  prizeAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  actionButtons: {
    marginBottom: 15,
  },
  joinButton: {
    borderColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 12,
  },
  joinButtonText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
  },
  leaveButton: {
    borderColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 12,
  },
  leaveButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  fullText: {
    textAlign: 'center',
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 10,
    borderRadius: 10,
  },
  liveText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  emptyCard: {
    borderRadius: 15,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
});

export default MatchesScreen;
