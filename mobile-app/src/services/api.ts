import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create axios instance
const api = axios.create({
  baseURL: process.env.API_BASE_URL || 'http://localhost:3001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, remove it and redirect to login
      try {
        await AsyncStorage.removeItem('authToken');
        // You can dispatch a logout action here if using Redux
      } catch (storageError) {
        console.error('Error removing auth token:', storageError);
      }
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (email: string, password: string) => 
    api.post('/api/auth/login', { email, password }),
  
  register: (userData: any) => 
    api.post('/api/auth/register', userData),
  
  logout: () => 
    api.post('/api/auth/logout'),
  
  getProfile: () => 
    api.get('/api/auth/profile'),
  
  updateProfile: (profileData: any) => 
    api.put('/api/auth/profile', profileData),
  
  changePassword: (passwordData: any) => 
    api.put('/api/auth/password', passwordData),
};

export const tournamentAPI = {
  getAll: (params?: any) => 
    api.get('/api/tournaments', { params }),
  
  getById: (id: string) => 
    api.get(`/api/tournaments/${id}`),
  
  register: (tournamentId: string) => 
    api.post(`/api/tournaments/${tournamentId}/register`),
  
  unregister: (tournamentId: string) => 
    api.post(`/api/tournaments/${tournamentId}/unregister`),
  
  getUpcoming: () => 
    api.get('/api/tournaments/upcoming'),
  
  getLive: () => 
    api.get('/api/tournaments/live'),
};

export const matchAPI = {
  getAll: (params?: any) => 
    api.get('/api/matches', { params }),
  
  getById: (id: string) => 
    api.get(`/api/matches/${id}`),
  
  getByTournament: (tournamentId: string, params?: any) => 
    api.get(`/api/matches/tournament/${tournamentId}`, { params }),
  
  join: (matchId: string, data?: any) => 
    api.post(`/api/matches/${matchId}/join`, data),
  
  leave: (matchId: string) => 
    api.post(`/api/matches/${matchId}/leave`),
  
  getUpcoming: () => 
    api.get('/api/matches/upcoming'),
  
  getLive: () => 
    api.get('/api/matches/live'),
};

export const walletAPI = {
  getBalance: () => 
    api.get('/api/payments/wallet'),
  
  getTransactions: (params?: any) => 
    api.get('/api/payments/transactions', { params }),
  
  deposit: (data: any) => 
    api.post('/api/payments/deposit', data),
  
  withdraw: (data: any) => 
    api.post('/api/payments/withdraw', data),
  
  getTransactionSummary: () => 
    api.get('/api/payments/transaction-summary'),
};

export const socialAPI = {
  getFriends: () => 
    api.get('/api/social/friends'),
  
  getFriendRequests: () => 
    api.get('/api/social/friend-requests'),
  
  sendFriendRequest: (userId: string, message?: string) => 
    api.post('/api/social/friend-requests', { toUserId: userId, message }),
  
  acceptFriendRequest: (requestId: string, message?: string) => 
    api.put(`/api/social/friend-requests/${requestId}/accept`, { message }),
  
  rejectFriendRequest: (requestId: string, message?: string) => 
    api.put(`/api/social/friend-requests/${requestId}/reject`, { message }),
  
  getLeaderboard: (params?: any) => 
    api.get('/api/social/leaderboard', { params }),
  
  getNotifications: (params?: any) => 
    api.get('/api/social/notifications', { params }),
  
  markNotificationRead: (notificationId: string) => 
    api.put(`/api/social/notifications/${notificationId}/read`),
};

export const antiCheatAPI = {
  getFlagsByUser: (userId: string, params?: any) => 
    api.get(`/api/anti-cheat/user/${userId}`, { params }),
  
  getFlagsByMatch: (matchId: string) => 
    api.get(`/api/anti-cheat/match/${matchId}`),
};

export { api };
