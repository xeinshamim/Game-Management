import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Users, Trophy, DollarSign, Gamepad2, Calendar, BarChart3, PieChart, Activity, Download, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'react-hot-toast';
import { api } from '../../services/api';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalTournaments: number;
    totalMatches: number;
    totalRevenue: number;
    activeUsers: number;
    pendingKYC: number;
    pendingTransactions: number;
    activeFlags: number;
  };
  userGrowth: Array<{
    date: string;
    users: number;
    newUsers: number;
  }>;
  revenueData: Array<{
    date: string;
    revenue: number;
    deposits: number;
    withdrawals: number;
  }>;
  tournamentStats: Array<{
    gameType: string;
    tournaments: number;
    participants: number;
    revenue: number;
  }>;
  matchStats: Array<{
    date: string;
    matches: number;
    completed: number;
    cancelled: number;
  }>;
  userActivity: Array<{
    hour: number;
    activeUsers: number;
    matches: number;
  }>;
  topPlayers: Array<{
    username: string;
    totalMatches: number;
    wins: number;
    winRate: number;
    totalPrizeMoney: number;
  }>;
  antiCheatStats: Array<{
    cheatType: string;
    count: number;
    severity: string;
  }>;
  paymentMethods: Array<{
    method: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
  realTimeMetrics: {
    currentOnlineUsers: number;
    activeMatches: number;
    pendingTournaments: number;
    systemLoad: number;
  };
}

const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [activeChart, setActiveChart] = useState<'overview' | 'users' | 'revenue' | 'tournaments' | 'matches'>('overview');
  const [showRealTime, setShowRealTime] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get(`/analytics?range=${timeRange}`);
      setData(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      toast.error('Failed to fetch analytics data');
      // Use mock data for demonstration
      setData(getMockData());
    } finally {
      setLoading(false);
    }
  };

  const exportAnalytics = async (format: 'csv' | 'json' | 'pdf') => {
    setExporting(true);
    try {
      const response = await api.get(`/analytics/export?format=${format}&range=${timeRange}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`Analytics exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export analytics');
    } finally {
      setExporting(false);
    }
  };

  const getMockData = (): AnalyticsData => {
    const now = new Date();
    const dates = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return {
      overview: {
        totalUsers: 15420,
        totalTournaments: 892,
        totalMatches: 15420,
        totalRevenue: 1250000,
        activeUsers: 3240,
        pendingKYC: 156,
        pendingTransactions: 89,
        activeFlags: 23,
      },
      userGrowth: dates.map((date, i) => ({
        date,
        users: 12000 + Math.floor(Math.random() * 5000),
        newUsers: Math.floor(Math.random() * 200) + 50,
      })),
      revenueData: dates.map((date, i) => ({
        date,
        revenue: Math.floor(Math.random() * 50000) + 20000,
        deposits: Math.floor(Math.random() * 40000) + 15000,
        withdrawals: Math.floor(Math.random() * 30000) + 10000,
      })),
      tournamentStats: [
        { gameType: 'BR MATCH', tournaments: 245, participants: 2450, revenue: 245000 },
        { gameType: 'CLASH SQUAD', tournaments: 189, participants: 1890, revenue: 189000 },
        { gameType: 'LONE WOLF', tournaments: 156, participants: 1560, revenue: 156000 },
        { gameType: 'CS 2 VS 2', tournaments: 302, participants: 3020, revenue: 302000 },
      ],
      matchStats: dates.map((date, i) => ({
        date,
        matches: Math.floor(Math.random() * 100) + 50,
        completed: Math.floor(Math.random() * 80) + 40,
        cancelled: Math.floor(Math.random() * 20) + 5,
      })),
      userActivity: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        activeUsers: Math.floor(Math.random() * 1000) + 200,
        matches: Math.floor(Math.random() * 100) + 20,
      })),
      topPlayers: [
        { username: 'ProGamer123', totalMatches: 156, wins: 134, winRate: 85.9, totalPrizeMoney: 12500 },
        { username: 'ElitePlayer', totalMatches: 142, wins: 118, winRate: 83.1, totalPrizeMoney: 11200 },
        { username: 'Champion2024', totalMatches: 128, wins: 105, winRate: 82.0, totalPrizeMoney: 9800 },
        { username: 'VictoryKing', totalMatches: 135, wins: 108, winRate: 80.0, totalPrizeMoney: 9200 },
        { username: 'TopScorer', totalMatches: 119, wins: 94, winRate: 79.0, totalPrizeMoney: 8700 },
      ],
      antiCheatStats: [
        { cheatType: 'Aimbot', count: 8, severity: 'high' },
        { cheatType: 'Wallhack', count: 12, severity: 'medium' },
        { cheatType: 'Speed Hack', count: 3, severity: 'high' },
        { cheatType: 'Macro Usage', count: 15, severity: 'low' },
      ],
      paymentMethods: [
        { method: 'bKash', count: 1250, amount: 450000, percentage: 45 },
        { method: 'Nagad', count: 980, amount: 380000, percentage: 35 },
        { method: 'Bank Transfer', count: 320, amount: 170000, percentage: 20 },
      ],
      realTimeMetrics: {
        currentOnlineUsers: Math.floor(Math.random() * 500) + 2000,
        activeMatches: Math.floor(Math.random() * 50) + 25,
        pendingTournaments: Math.floor(Math.random() * 10) + 5,
        systemLoad: Math.random() * 100,
      },
    };
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No analytics data available</h3>
        <p className="text-gray-500 mb-4">Unable to load analytics data. Please try again.</p>
        <button
          onClick={fetchAnalytics}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Comprehensive platform analytics and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRealTime(!showRealTime)}
              className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                showRealTime
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {showRealTime ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
              Real-time
            </button>
            <span className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
          
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>

          <div className="relative">
            <button
              onClick={() => exportAnalytics('csv')}
              disabled={exporting}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Metrics */}
      {showRealTime && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Online Users</p>
                <p className="text-3xl font-bold">{formatNumber(data.realTimeMetrics.currentOnlineUsers)}</p>
              </div>
              <Users className="h-8 w-8 text-blue-200" />
            </div>
            <div className="mt-4">
              <div className="flex items-center text-blue-100 text-sm">
                <Activity className="h-4 w-4 mr-1" />
                Live
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Active Matches</p>
                <p className="text-3xl font-bold">{data.realTimeMetrics.activeMatches}</p>
              </div>
              <Gamepad2 className="h-8 w-8 text-green-200" />
            </div>
            <div className="mt-4">
              <div className="flex items-center text-green-100 text-sm">
                <Activity className="h-4 w-4 mr-1" />
                Running
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Pending Tournaments</p>
                <p className="text-3xl font-bold">{data.realTimeMetrics.pendingTournaments}</p>
              </div>
              <Trophy className="h-8 w-8 text-purple-200" />
            </div>
            <div className="mt-4">
              <div className="flex items-center text-purple-100 text-sm">
                <Calendar className="h-4 w-4 mr-1" />
                Scheduled
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">System Load</p>
                <p className="text-3xl font-bold">{data.realTimeMetrics.systemLoad.toFixed(1)}%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-200" />
            </div>
            <div className="mt-4">
              <div className="flex items-center text-orange-100 text-sm">
                <Activity className="h-4 w-4 mr-1" />
                {data.realTimeMetrics.systemLoad > 80 ? 'High' : data.realTimeMetrics.systemLoad > 50 ? 'Medium' : 'Low'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(data.overview.totalUsers)}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">+12.5%</span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Trophy className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tournaments</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(data.overview.totalTournaments)}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">+8.2%</span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Gamepad2 className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Matches</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(data.overview.totalMatches)}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">+15.3%</span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.overview.totalRevenue)}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">+22.1%</span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        </div>
      </div>

      {/* Chart Navigation */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'overview', name: 'Overview', icon: BarChart3 },
            { id: 'users', name: 'User Growth', icon: Users },
            { id: 'revenue', name: 'Revenue', icon: DollarSign },
            { id: 'tournaments', name: 'Tournaments', icon: Trophy },
            { id: 'matches', name: 'Matches', icon: Gamepad2 },
          ].map((chart) => {
            const Icon = chart.icon;
            return (
              <button
                key={chart.id}
                onClick={() => setActiveChart(chart.id as any)}
                className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                  activeChart === chart.id
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {chart.name}
              </button>
            );
          })}
        </div>

        {/* Chart Content */}
        <div className="min-h-[400px]">
          {/* Overview Chart */}
          {activeChart === 'overview' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Platform Overview</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="users" stroke="#3B82F6" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="newUsers" stroke="#10B981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* User Growth Chart */}
          {activeChart === 'users' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">User Growth Trend</h3>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={data.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="users" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="newUsers" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Revenue Chart */}
          {activeChart === 'revenue' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Revenue Analysis</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#3B82F6" />
                  <Bar dataKey="deposits" fill="#10B981" />
                  <Bar dataKey="withdrawals" fill="#EF4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tournament Stats Chart */}
          {activeChart === 'tournaments' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Tournament Statistics by Game Type</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.tournamentStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="gameType" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(value, name) => [name === 'revenue' ? formatCurrency(value as number) : value, name]} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="tournaments" fill="#3B82F6" />
                  <Bar yAxisId="right" dataKey="revenue" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Match Stats Chart */}
          {activeChart === 'matches' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Match Statistics</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.matchStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="matches" stroke="#3B82F6" strokeWidth={2} />
                  <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2} />
                  <Line type="monotone" dataKey="cancelled" stroke="#EF4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Players */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Top Players</h3>
          <div className="space-y-3">
            {data.topPlayers.map((player, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{player.username}</p>
                    <p className="text-sm text-gray-600">Win Rate: {player.winRate}%</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(player.totalPrizeMoney)}</p>
                  <p className="text-sm text-gray-600">{player.totalMatches} matches</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Anti-Cheat Statistics */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Anti-Cheat Statistics</h3>
          <div className="space-y-3">
            {data.antiCheatStats.map((stat, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    stat.severity === 'high' ? 'bg-red-500' :
                    stat.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <div>
                    <p className="font-medium">{stat.cheatType}</p>
                    <p className="text-sm text-gray-600 capitalize">{stat.severity} severity</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">{stat.count}</p>
                  <p className="text-sm text-gray-600">flags</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Methods Distribution */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">Payment Methods Distribution</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={data.paymentMethods}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="percentage"
              >
                {data.paymentMethods.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#3B82F6', '#10B981', '#F59E0B'][index % 3]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [name === 'amount' ? formatCurrency(value as number) : value, name]} />
            </RechartsPieChart>
          </ResponsiveContainer>
          
          <div className="space-y-4">
            {data.paymentMethods.map((method, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full`} style={{ backgroundColor: ['#3B82F6', '#10B981', '#F59E0B'][index % 3] }} />
                  <div>
                    <p className="font-medium">{method.method}</p>
                    <p className="text-sm text-gray-600">{method.count} transactions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(method.amount)}</p>
                  <p className="text-sm text-gray-600">{method.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Activity Heatmap */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">24-Hour User Activity</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data.userActivity}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="activeUsers" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
            <Area type="monotone" dataKey="matches" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Analytics;
