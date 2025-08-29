import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Users, UserPlus, UserMinus, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../../services/api';

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
  toUser: {
    _id: string;
    username: string;
    displayName: string;
    profile?: {
      avatar?: string;
    };
  };
  status: 'pending' | 'accepted' | 'rejected' | 'removed';
  createdAt: string;
}

interface Friendship {
  _id: string;
  user1: {
    _id: string;
    username: string;
    displayName: string;
    profile?: {
      avatar?: string;
    };
  };
  user2: {
    _id: string;
    username: string;
    displayName: string;
    profile?: {
      avatar?: string;
    };
  };
  status: 'active' | 'removed';
  createdAt: string;
}

const Social: React.FC = () => {
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'friendships'>('requests');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchFriendRequests();
    } else {
      fetchFriendships();
    }
  }, [activeTab]);

  const fetchFriendRequests = async () => {
    try {
      const response = await api.get('/social/friend-requests');
      setFriendRequests(response.data);
    } catch (error) {
      toast.error('Failed to fetch friend requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendships = async () => {
    try {
      const response = await api.get('/social/friendships');
      setFriendships(response.data);
    } catch (error) {
      toast.error('Failed to fetch friendships');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await api.put(`/social/friend-requests/${requestId}/approve`);
        toast.success('Friend request approved');
      } else {
        await api.put(`/social/friend-requests/${requestId}/reject`);
        toast.success('Friend request rejected');
      }
      fetchFriendRequests();
    } catch (error) {
      toast.error(`Failed to ${action} friend request`);
    }
  };

  const removeFriendship = async (friendshipId: string) => {
    if (!confirm('Are you sure you want to remove this friendship?')) return;
    
    try {
      await api.delete(`/social/friendships/${friendshipId}`);
      toast.success('Friendship removed');
      fetchFriendships();
    } catch (error) {
      toast.error('Failed to remove friendship');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'removed': return 'bg-gray-100 text-gray-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRequests = friendRequests.filter(request => {
    const matchesSearch = 
      request.fromUser.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.fromUser.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.toUser.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.toUser.displayName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const filteredFriendships = friendships.filter(friendship => {
    const matchesSearch = 
      friendship.user1.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      friendship.user1.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      friendship.user2.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      friendship.user2.displayName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || friendship.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Social Management</h1>
        <div className="text-sm text-gray-600">
          {activeTab === 'requests' 
            ? `Total Requests: ${friendRequests.length}` 
            : `Total Friendships: ${friendships.length}`
          }
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('requests')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'requests'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Friend Requests ({friendRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('friendships')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'friendships'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Friendships ({friendships.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Filters */}
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by username or display name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Status</option>
                  {activeTab === 'requests' ? (
                    <>
                      <option value="pending">Pending</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                      <option value="removed">Removed</option>
                    </>
                  ) : (
                    <>
                      <option value="active">Active</option>
                      <option value="removed">Removed</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Friend Requests Tab */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div key={request._id} className="bg-gray-50 rounded-lg p-4 border">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">From:</span> {request.fromUser.displayName} (@{request.fromUser.username})
                        </div>
                        <div>
                          <span className="font-medium">To:</span> {request.toUser.displayName} (@{request.toUser.username})
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleRequestAction(request._id, 'approve')}
                            className="text-green-600 hover:text-green-900"
                            title="Approve Request"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => handleRequestAction(request._id, 'reject')}
                            className="text-red-600 hover:text-red-900"
                            title="Reject Request"
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

          {/* Friendships Tab */}
          {activeTab === 'friendships' && (
            <div className="space-y-4">
              {filteredFriendships.map((friendship) => (
                <div key={friendship._id} className="bg-gray-50 rounded-lg p-4 border">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(friendship.status)}`}>
                          {friendship.status}
                        </span>
                        <span className="text-sm text-gray-500">
                          Friends since {new Date(friendship.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">User 1:</span> {friendship.user1.displayName} (@{friendship.user1.username})
                        </div>
                        <div>
                          <span className="font-medium">User 2:</span> {friendship.user2.displayName} (@{friendship.user2.username})
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => removeFriendship(friendship._id)}
                        className="text-red-600 hover:text-red-900"
                        title="Remove Friendship"
                      >
                        <UserMinus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {((activeTab === 'requests' && filteredRequests.length === 0) ||
            (activeTab === 'friendships' && filteredFriendships.length === 0)) && (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No {activeTab === 'requests' ? 'friend requests' : 'friendships'} found
              </h3>
              <p className="text-gray-500">
                {activeTab === 'requests' 
                  ? 'There are no friend requests matching your search criteria.'
                  : 'There are no friendships matching your search criteria.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Social;
