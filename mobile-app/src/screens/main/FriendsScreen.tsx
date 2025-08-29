import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { Button, Card, Badge } from 'react-native-elements';
import { useAuth } from '../../context/AuthContext';
import { socialAPI } from '../../services/api';

interface Friend {
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  stats: {
    totalMatches: number;
    wins: number;
    winRate: number;
    rank: number;
  };
  friendshipId: string;
}

interface FriendRequest {
  _id: string;
  fromUser: {
    _id: string;
    username: string;
    displayName: string;
    profile?: {
      avatar?: string;
    };
  };
  status: string;
  createdAt: string;
}

const FriendsScreen: React.FC = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');

  useEffect(() => {
    if (user) {
      fetchFriends();
      fetchFriendRequests();
    }
  }, [user]);

  const fetchFriends = async () => {
    try {
      const response = await socialAPI.getFriends();
      setFriends(response.data);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const response = await socialAPI.getFriendRequests();
      setFriendRequests(response.data);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchFriends(), fetchFriendRequests()]);
    setRefreshing(false);
  };

  const handleFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      if (action === 'accept') {
        await socialAPI.acceptFriendRequest(requestId);
      } else {
        await socialAPI.rejectFriendRequest(requestId);
      }

      Alert.alert('Success', `Friend request ${action === 'accept' ? 'accepted' : 'rejected'}`);
      fetchFriendRequests();
      if (action === 'accept') {
        fetchFriends();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process friend request');
    }
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <Card containerStyle={styles.friendCard}>
      <View style={styles.friendHeader}>
        <Image
          source={
            item.avatar
              ? { uri: item.avatar }
              : { uri: `https://ui-avatars.com/api/?name=${item.displayName}&background=random` }
          }
          style={styles.avatar}
        />
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.displayName}</Text>
          <Text style={styles.friendUsername}>@{item.username}</Text>
          <Text style={styles.friendStats}>
            Rank #{item.stats.rank} • {item.stats.winRate.toFixed(1)}% Win Rate
          </Text>
        </View>
        <Badge value={`#${item.stats.rank}`} status="primary" />
      </View>
    </Card>
  );

  const renderFriendRequest = ({ item }: { item: FriendRequest }) => (
    <Card containerStyle={styles.requestCard}>
      <View style={styles.requestHeader}>
        <Image
          source={
            item.fromUser.profile?.avatar
              ? { uri: item.fromUser.profile.avatar }
              : { uri: `https://ui-avatars.com/api/?name=${item.fromUser.displayName}&background=random` }
          }
          style={styles.avatar}
        />
        <View style={styles.requestInfo}>
          <Text style={styles.requestName}>{item.fromUser.displayName}</Text>
          <Text style={styles.requestUsername}>@{item.fromUser.username}</Text>
        </View>
      </View>

      <View style={styles.requestActions}>
        <Button
          title="Accept"
          type="solid"
          buttonStyle={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleFriendRequest(item._id, 'accept')}
        />
        <Button
          title="Reject"
          type="outline"
          buttonStyle={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleFriendRequest(item._id, 'reject')}
        />
      </View>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
            onPress={() => setActiveTab('friends')}
          >
            <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
              Friends ({friends.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
              Requests ({friendRequests.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={activeTab === 'friends' ? friends : friendRequests}
        renderItem={activeTab === 'friends' ? renderFriend : renderFriendRequest}
        keyExtractor={(item: Friend | FriendRequest) => 
          activeTab === 'friends' ? (item as Friend).friendshipId : (item as FriendRequest)._id
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'friends'
                ? 'No friends yet. Start adding friends to see them here!'
                : 'No pending friend requests'}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#333',
  },
  listContainer: {
    padding: 16,
  },
  friendCard: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
  },
  requestCard: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
  },
  friendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  requestHeader: {
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
  friendInfo: {
    flex: 1,
  },
  requestInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  requestName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  friendUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  requestUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  friendStats: {
    fontSize: 12,
    color: '#888',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
  },
  acceptButton: {
    backgroundColor: '#28a745',
  },
  rejectButton: {
    borderColor: '#dc3545',
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

export default FriendsScreen;
