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
import { tournamentAPI } from '../../services/api';

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
  entryFee: number;
  description: string;
}

const TournamentsScreen: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  useEffect(() => {
    loadTournaments();
  }, []);

  useEffect(() => {
    filterTournaments();
  }, [tournaments, searchQuery, selectedFilter]);

  const loadTournaments = async () => {
    try {
      setIsLoading(true);
      const response = await tournamentAPI.getAll();
      
      if (response.data.success) {
        setTournaments(response.data.data);
      }
    } catch (error) {
      console.error('Error loading tournaments:', error);
      Alert.alert('Error', 'Failed to load tournaments');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTournaments();
    setRefreshing(false);
  };

  const filterTournaments = () => {
    let filtered = tournaments;

    // Apply status filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(t => t.status === selectedFilter);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTournaments(filtered);
  };

  const handleRegister = async (tournamentId: string) => {
    try {
      const response = await tournamentAPI.register(tournamentId);
      if (response.data.success) {
        Alert.alert('Success', 'Successfully registered for tournament!');
        loadTournaments(); // Refresh to update participant count
      }
    } catch (error: any) {
      Alert.alert('Registration Failed', error.response?.data?.message || 'Failed to register for tournament');
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
      case 'REGISTRATION_OPEN': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'UPCOMING': return 'Upcoming';
      case 'LIVE': return 'Live';
      case 'COMPLETED': return 'Completed';
      case 'REGISTRATION_OPEN': return 'Registration Open';
      default: return status;
    }
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
        <Text style={styles.headerTitle}>Tournaments</Text>
        <Text style={styles.headerSubtitle}>Find and join competitive tournaments</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          placeholder="Search tournaments..."
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
        <FilterButton title="Registration Open" filter="REGISTRATION_OPEN" isActive={selectedFilter === 'REGISTRATION_OPEN'} />
        <FilterButton title="Upcoming" filter="UPCOMING" isActive={selectedFilter === 'UPCOMING'} />
        <FilterButton title="Live" filter="LIVE" isActive={selectedFilter === 'LIVE'} />
        <FilterButton title="Completed" filter="COMPLETED" isActive={selectedFilter === 'COMPLETED'} />
      </ScrollView>

      {/* Tournaments List */}
      <ScrollView
        style={styles.tournamentsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredTournaments.length > 0 ? (
          filteredTournaments.map((tournament) => (
            <Card key={tournament._id} containerStyle={styles.tournamentCard}>
              <View style={styles.tournamentHeader}>
                <Text style={styles.tournamentName}>{tournament.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tournament.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(tournament.status)}</Text>
                </View>
              </View>

              <Text style={styles.tournamentType}>{tournament.type}</Text>
              <Text style={styles.tournamentDescription} numberOfLines={2}>
                {tournament.description}
              </Text>

              <View style={styles.tournamentInfo}>
                <View style={styles.infoRow}>
                  <Icon name="time" type="ionicon" size={16} color="#64748b" />
                  <Text style={styles.infoText}>
                    Starts: {formatTime(tournament.startTime)}
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

                {tournament.entryFee > 0 && (
                  <View style={styles.infoRow}>
                    <Icon name="card" type="ionicon" size={16} color="#64748b" />
                    <Text style={styles.infoText}>
                      Entry Fee: ${tournament.entryFee}
                    </Text>
                  </View>
                )}
              </View>

              {tournament.status === 'REGISTRATION_OPEN' && (
                <Button
                  title="Register Now"
                  type="outline"
                  buttonStyle={styles.registerButton}
                  titleStyle={styles.registerButtonText}
                  onPress={() => handleRegister(tournament._id)}
                  disabled={tournament.participantCount >= tournament.maxParticipants}
                />
              )}

              {tournament.participantCount >= tournament.maxParticipants && (
                <Text style={styles.fullText}>Tournament is full</Text>
              )}
            </Card>
          ))
        ) : (
          <Card containerStyle={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {searchQuery || selectedFilter !== 'all' 
                ? 'No tournaments match your criteria' 
                : 'No tournaments available at the moment'}
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
  tournamentsList: {
    flex: 1,
    padding: 20,
  },
  tournamentCard: {
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
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  tournamentName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 10,
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
  tournamentType: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '500',
    marginBottom: 10,
  },
  tournamentDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 15,
  },
  tournamentInfo: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#475569',
  },
  registerButton: {
    borderColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 12,
  },
  registerButtonText: {
    color: '#10b981',
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

export default TournamentsScreen;
