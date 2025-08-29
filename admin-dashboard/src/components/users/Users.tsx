import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Shield, ShieldOff, Ban, UserCheck, Mail, Calendar, Trophy, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../../services/api';

interface User {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended' | 'banned';
  isVerified: boolean;
  createdAt: string;
  lastLogin?: string;
  profile: {
    avatar?: string;
    bio?: string;
    location?: string;
    dateOfBirth?: string;
  };
  stats: {
    totalMatches: number;
    wins: number;
    winRate: number;
    totalPrizeMoney: number;
    tournamentsJoined: number;
    tournamentsWon: number;
    rank: number;
  };
  wallet: {
    balance: number;
    totalDeposits: number;
    totalWithdrawals: number;
  };
  kyc: {
    status: 'pending' | 'approved' | 'rejected';
    documents: Array<{
      type: string;
      status: string;
      submittedAt: string;
    }>;
  };
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterVerification, setFilterVerification] = useState<string>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      await api.put(`/users/${userId}/status`, { status: newStatus });
      toast.success(`User status updated to ${newStatus}`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleVerificationToggle = async (userId: string, isVerified: boolean) => {
    try {
      await api.put(`/users/${userId}/verification`, { isVerified });
      toast.success(`User verification ${isVerified ? 'enabled' : 'disabled'}`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user verification');
    }
  };

  const handleKYCApproval = async (userId: string, status: string) => {
    try {
      await api.put(`/users/${userId}/kyc`, { status });
      toast.success(`KYC status updated to ${status}`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update KYC status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      case 'banned': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'user': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVerificationColor = (isVerified: boolean) => {
    return isVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getKYCColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.displayName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    const matchesVerification = filterVerification === 'all' || 
                               (filterVerification === 'verified' && user.isVerified) ||
                               (filterVerification === 'unverified' && !user.isVerified);
    
    return matchesSearch && matchesRole && matchesStatus && matchesVerification;
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
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <div className="text-sm text-gray-600">
          Total Users: {users.length}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
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
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Verification</label>
            <select
              value={filterVerification}
              onChange={(e) => setFilterVerification(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role & Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Verification
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stats
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wallet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img
                          className="h-10 w-10 rounded-full"
                          src={user.profile.avatar || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`}
                          alt=""
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
                        <div className="text-sm text-gray-500">{user.username}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getVerificationColor(user.isVerified)}`}>
                        {user.isVerified ? 'Verified' : 'Unverified'}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getKYCColor(user.kyc.status)}`}>
                        KYC: {user.kyc.status}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="space-y-1">
                      <div>Matches: {user.stats.totalMatches}</div>
                      <div>Win Rate: {user.stats.winRate}%</div>
                      <div>Rank: #{user.stats.rank}</div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="space-y-1">
                      <div>Balance: ${user.wallet.balance}</div>
                      <div>Total: ${user.wallet.totalDeposits}</div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowDetailsModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye size={16} />
                      </button>
                      
                      {user.status === 'active' ? (
                        <button
                          onClick={() => handleStatusChange(user._id, 'suspended')}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Suspend User"
                        >
                          <ShieldOff size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(user._id, 'active')}
                          className="text-green-600 hover:text-green-900"
                          title="Activate User"
                        >
                          <Shield size={16} />
                        </button>
                      )}

                      {user.status !== 'banned' && (
                        <button
                          onClick={() => handleStatusChange(user._id, 'banned')}
                          className="text-red-600 hover:text-red-900"
                          title="Ban User"
                        >
                          <Ban size={16} />
                        </button>
                      )}

                      <button
                        onClick={() => handleVerificationToggle(user._id, !user.isVerified)}
                        className={`${user.isVerified ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                        title={user.isVerified ? 'Remove Verification' : 'Verify User'}
                      >
                        <UserCheck size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      {showDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">User Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Profile Information</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Display Name:</span> {selectedUser.displayName}</p>
                  <p><span className="font-medium">Username:</span> {selectedUser.username}</p>
                  <p><span className="font-medium">Email:</span> {selectedUser.email}</p>
                  <p><span className="font-medium">Role:</span> 
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getRoleColor(selectedUser.role)}`}>
                      {selectedUser.role}
                    </span>
                  </p>
                  <p><span className="font-medium">Status:</span> 
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusColor(selectedUser.status)}`}>
                      {selectedUser.status}
                    </span>
                  </p>
                  <p><span className="font-medium">Joined:</span> {new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                  {selectedUser.lastLogin && (
                    <p><span className="font-medium">Last Login:</span> {new Date(selectedUser.lastLogin).toLocaleString()}</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Gaming Statistics</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Total Matches:</span> {selectedUser.stats.totalMatches}</p>
                  <p><span className="font-medium">Wins:</span> {selectedUser.stats.wins}</p>
                  <p><span className="font-medium">Win Rate:</span> {selectedUser.stats.winRate}%</p>
                  <p><span className="font-medium">Total Prize Money:</span> ${selectedUser.stats.totalPrizeMoney}</p>
                  <p><span className="font-medium">Tournaments Joined:</span> {selectedUser.stats.tournamentsJoined}</p>
                  <p><span className="font-medium">Tournaments Won:</span> {selectedUser.stats.tournamentsWon}</p>
                  <p><span className="font-medium">Current Rank:</span> #{selectedUser.stats.rank}</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold mb-2">Wallet Information</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Current Balance:</span>
                    <p className="text-lg font-bold text-green-600">${selectedUser.wallet.balance}</p>
                  </div>
                  <div>
                    <span className="font-medium">Total Deposits:</span>
                    <p className="text-lg font-bold text-blue-600">${selectedUser.wallet.totalDeposits}</p>
                  </div>
                  <div>
                    <span className="font-medium">Total Withdrawals:</span>
                    <p className="text-lg font-bold text-red-600">${selectedUser.wallet.totalWithdrawals}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold mb-2">KYC Documents</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                {selectedUser.kyc.documents.length > 0 ? (
                  <div className="space-y-2">
                    {selectedUser.kyc.documents.map((doc, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                        <span className="text-sm">{doc.type}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${getKYCColor(doc.status)}`}>
                          {doc.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(doc.submittedAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No KYC documents submitted</p>
                )}
                
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleKYCApproval(selectedUser._id, 'approved')}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200"
                  >
                    Approve KYC
                  </button>
                  <button
                    onClick={() => handleKYCApproval(selectedUser._id, 'rejected')}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200"
                  >
                    Reject KYC
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailsModal(false)}
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

export default Users;
