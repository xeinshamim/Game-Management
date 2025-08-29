import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
      localStorage.removeItem('adminToken');
      delete api.defaults.headers.common['Authorization'];
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (email: string, password: string) => 
    api.post('/api/auth/admin/login', { email, password }),
  
  logout: () => 
    api.post('/api/auth/logout'),
  
  getProfile: () => 
    api.get('/api/auth/profile'),
  
  updateProfile: (profileData: any) => 
    api.put('/api/auth/profile', profileData),
};

export const tournamentAPI = {
  getAll: (params?: any) => 
    api.get('/api/tournaments', { params }),
  
  getById: (id: string) => 
    api.get(`/api/tournaments/${id}`),
  
  create: (tournamentData: any) => 
    api.post('/api/tournaments', tournamentData),
  
  update: (id: string, tournamentData: any) => 
    api.put(`/api/tournaments/${id}`, tournamentData),
  
  delete: (id: string) => 
    api.delete(`/api/tournaments/${id}`),
  
  getUpcoming: () => 
    api.get('/api/tournaments/upcoming'),
  
  getLive: () => 
    api.get('/api/tournaments/live'),
  
  getStatistics: () => 
    api.get('/api/tournaments/statistics'),
};

export const matchAPI = {
  getAll: (params?: any) => 
    api.get('/api/matches', { params }),
  
  getById: (id: string) => 
    api.get(`/api/matches/${id}`),
  
  create: (matchData: any) => 
    api.post('/api/matches', matchData),
  
  update: (id: string, matchData: any) => 
    api.put(`/api/matches/${id}`, matchData),
  
  delete: (id: string) => 
    api.delete(`/api/matches/${id}`),
  
  start: (id: string) => 
    api.post(`/api/matches/${id}/start`),
  
  end: (id: string) => 
    api.post(`/api/matches/${id}/end`),
  
  updateResults: (id: string, results: any) => 
    api.put(`/api/matches/${id}/results`, { results }),
  
  getByTournament: (tournamentId: string, params?: any) => 
    api.get(`/api/matches/tournament/${tournamentId}`, { params }),
  
  getUpcoming: () => 
    api.get('/api/matches/upcoming'),
  
  getLive: () => 
    api.get('/api/matches/live'),
  
  getStatistics: () => 
    api.get('/api/matches/statistics'),
};

export const userAPI = {
  getAll: (params?: any) => 
    api.get('/api/auth/users', { params }),
  
  getById: (id: string) => 
    api.get(`/api/auth/users/${id}`),
  
  update: (id: string, userData: any) => 
    api.put(`/api/auth/users/${id}`, userData),
  
  delete: (id: string) => 
    api.delete(`/api/auth/users/${id}`),
  
  suspend: (id: string, reason: string) => 
    api.post(`/api/auth/users/${id}/suspend`, { reason }),
  
  restore: (id: string) => 
    api.post(`/api/auth/users/${id}/restore`),
  
  getStatistics: () => 
    api.get('/api/auth/users/statistics'),
};

export const antiCheatAPI = {
  getAllFlags: (params?: any) => 
    api.get('/api/anti-cheat', { params }),
  
  getFlagById: (id: string) => 
    api.get(`/api/anti-cheat/${id}`),
  
  createFlag: (flagData: any) => 
    api.post('/api/anti-cheat', flagData),
  
  updateFlagStatus: (id: string, statusData: any) => 
    api.put(`/api/anti-cheat/${id}/status`, statusData),
  
  handleAppeal: (id: string, appealData: any) => 
    api.put(`/api/anti-cheat/${id}/appeal`, appealData),
  
  getPendingFlags: (params?: any) => 
    api.get('/api/anti-cheat/pending', { params }),
  
  getHighSeverityFlags: (params?: any) => 
    api.get('/api/anti-cheat/high-severity', { params }),
  
  getStatistics: () => 
    api.get('/api/anti-cheat/statistics'),
  
  getUserRiskScore: (userId: string) => 
    api.get(`/api/anti-cheat/user/${userId}/risk-score`),
  
  bulkAction: (actionData: any) => 
    api.post('/api/anti-cheat/bulk-action', actionData),
};

export const paymentAPI = {
  getAllWallets: (params?: any) => 
    api.get('/api/payments/wallets', { params }),
  
  getWalletById: (id: string) => 
    api.get(`/api/payments/wallets/${id}`),
  
  updateVerificationStatus: (id: string, status: string) => 
    api.put(`/api/payments/wallets/${id}/verification`, { status }),
  
  toggleSuspension: (id: string, suspended: boolean, reason?: string) => 
    api.put(`/api/payments/wallets/${id}/suspension`, { suspended, reason }),
  
  getAllTransactions: (params?: any) => 
    api.get('/api/payments/transactions', { params }),
  
  getTransactionById: (id: string) => 
    api.get(`/api/payments/transactions/${id}`),
  
  approveWithdrawal: (id: string, notes?: string) => 
    api.put(`/api/payments/transactions/${id}/approve`, { notes }),
  
  rejectWithdrawal: (id: string, reason: string) => 
    api.put(`/api/payments/transactions/${id}/reject`, { reason }),
  
  getStatistics: () => 
    api.get('/api/payments/statistics'),
};

export const socialAPI = {
  getAllFriends: (params?: any) => 
    api.get('/api/social/friends', { params }),
  
  getFriendRequests: (params?: any) => 
    api.get('/api/social/friend-requests', { params }),
  
  getLeaderboard: (params?: any) => 
    api.get('/api/social/leaderboard', { params }),
  
  getNotifications: (params?: any) => 
    api.get('/api/social/notifications', { params }),
  
  getStatistics: () => 
    api.get('/api/social/statistics'),
};

export { api };
