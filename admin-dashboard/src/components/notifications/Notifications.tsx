import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Trash2, Send, Bell, Users, Trophy, Gamepad2, DollarSign } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../../services/api';

interface Notification {
  _id: string;
  userId?: string;
  username?: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  status: 'unread' | 'read';
  createdAt: string;
  readAt?: string;
}

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [filterType, filterStatus]);

  const fetchNotifications = async () => {
    try {
      const params: any = {};
      if (filterType !== 'all') {
        params.type = filterType;
      }
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      
      const response = await api.get('/social/notifications', { params });
      setNotifications(response.data);
    } catch (error) {
      toast.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;
    
    try {
      await api.delete(`/social/notifications/${notificationId}`);
      toast.success('Notification deleted successfully');
      fetchNotifications();
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await api.put(`/social/notifications/${notificationId}/read`);
      toast.success('Notification marked as read');
      fetchNotifications();
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return <Users size={16} className="text-blue-600" />;
      case 'tournament_start':
        return <Trophy size={16} className="text-yellow-600" />;
      case 'match_result':
        return <Gamepad2 size={16} className="text-green-600" />;
      case 'prize_payout':
        return <DollarSign size={16} className="text-green-600" />;
      case 'system':
        return <Bell size={16} className="text-gray-600" />;
      default:
        return <Bell size={16} className="text-gray-600" />;
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'friend_request':
        return 'Friend Request';
      case 'tournament_start':
        return 'Tournament Start';
      case 'match_result':
        return 'Match Result';
      case 'prize_payout':
        return 'Prize Payout';
      case 'system':
        return 'System';
      default:
        return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unread':
        return 'bg-blue-100 text-blue-800';
      case 'read':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = 
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (notification.username && notification.username.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || notification.type === filterType;
    const matchesStatus = filterStatus === 'all' || notification.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
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
        <h1 className="text-2xl font-bold text-gray-900">Notifications Management</h1>
        <div className="text-sm text-gray-600">
          Total: {notifications.length} | Unread: {notifications.filter(n => n.status === 'unread').length}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Types</option>
              <option value="friend_request">Friend Request</option>
              <option value="tournament_start">Tournament Start</option>
              <option value="match_result">Match Result</option>
              <option value="prize_payout">Prize Payout</option>
              <option value="system">System</option>
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
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.map((notification) => (
          <div key={notification._id} className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {getNotificationIcon(notification.type)}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(notification.status)}`}>
                    {notification.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    {getNotificationTypeLabel(notification.type)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="mb-2">
                  <h3 className="font-medium text-gray-900">{notification.title}</h3>
                  <p className="text-sm text-gray-600">{notification.message}</p>
                  {notification.username && (
                    <p className="text-xs text-gray-500 mt-1">
                      User: {notification.username}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => {
                    setSelectedNotification(notification);
                    setShowDetailsModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-900"
                  title="View Details"
                >
                  <Eye size={16} />
                </button>
                
                {notification.status === 'unread' && (
                  <button
                    onClick={() => markAsRead(notification._id)}
                    className="text-green-600 hover:text-green-900"
                    title="Mark as Read"
                  >
                    <Send size={16} />
                  </button>
                )}
                
                <button
                  onClick={() => deleteNotification(notification._id)}
                  className="text-red-600 hover:text-red-900"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredNotifications.length === 0 && (
        <div className="text-center py-12">
          <Bell size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No notifications found
          </h3>
          <p className="text-gray-500">
            There are no notifications matching your search criteria.
          </p>
        </div>
      )}

      {/* Notification Details Modal */}
      {showDetailsModal && selectedNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Notification Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <p className="text-sm text-gray-900">
                    {getNotificationTypeLabel(selectedNotification.type)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedNotification.status)}`}>
                    {selectedNotification.status}
                  </span>
                </div>
                {selectedNotification.username && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User</label>
                    <p className="text-sm text-gray-900">{selectedNotification.username}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedNotification.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <p className="text-sm text-gray-900">{selectedNotification.title}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Message</label>
                <p className="text-sm text-gray-900">{selectedNotification.message}</p>
              </div>

              {selectedNotification.data && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Additional Data</label>
                  <pre className="text-sm text-gray-900 bg-gray-50 p-3 rounded border overflow-x-auto">
                    {JSON.stringify(selectedNotification.data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedNotification.readAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Read At</label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedNotification.readAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6 gap-2">
              {selectedNotification.status === 'unread' && (
                <button
                  onClick={() => {
                    markAsRead(selectedNotification._id);
                    setShowDetailsModal(false);
                  }}
                  className="bg-green-100 text-green-700 py-2 px-4 rounded-md hover:bg-green-200"
                >
                  Mark as Read
                </button>
              )}
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

export default Notifications;
