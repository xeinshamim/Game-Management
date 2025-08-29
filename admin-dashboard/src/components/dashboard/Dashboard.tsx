import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Trophy, 
  Gamepad2, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  Clock
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalTournaments: number;
  totalMatches: number;
  totalRevenue: number;
  activeUsers: number;
  pendingFlags: number;
  upcomingTournaments: number;
  liveMatches: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalTournaments: 0,
    totalMatches: 0,
    totalRevenue: 0,
    activeUsers: 0,
    pendingFlags: 0,
    upcomingTournaments: 0,
    liveMatches: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setIsLoading(true);
      // In a real app, you would fetch these from your API
      // For now, we'll use mock data
      setStats({
        totalUsers: 1250,
        totalTournaments: 45,
        totalMatches: 320,
        totalRevenue: 12500,
        activeUsers: 89,
        pendingFlags: 12,
        upcomingTournaments: 8,
        liveMatches: 3,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color, 
    change 
  }: { 
    title: string; 
    value: string | number; 
    icon: any; 
    color: string; 
    change?: string; 
  }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {change && (
            <p className="text-sm text-green-600 flex items-center">
              <TrendingUp className="h-4 w-4 mr-1" />
              {change}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const QuickActionCard = ({ 
    title, 
    description, 
    icon: Icon, 
    color, 
    onClick 
  }: { 
    title: string; 
    description: string; 
    icon: any; 
    color: string; 
    onClick: () => void; 
  }) => (
    <div 
      className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <div className={`p-3 rounded-full ${color} w-fit mb-4`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to your gaming tournament platform overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          icon={Users}
          color="bg-blue-500"
          change="+12% from last month"
        />
        <StatCard
          title="Total Tournaments"
          value={stats.totalTournaments}
          icon={Trophy}
          color="bg-yellow-500"
          change="+3 this week"
        />
        <StatCard
          title="Total Matches"
          value={stats.totalMatches}
          icon={Gamepad2}
          color="bg-green-500"
          change="+25 today"
        />
        <StatCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          color="bg-purple-500"
          change="+8% from last month"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Users"
          value={stats.activeUsers}
          icon={Users}
          color="bg-green-500"
        />
        <StatCard
          title="Pending Flags"
          value={stats.pendingFlags}
          icon={AlertTriangle}
          color="bg-red-500"
        />
        <StatCard
          title="Upcoming Tournaments"
          value={stats.upcomingTournaments}
          icon={Calendar}
          color="bg-indigo-500"
        />
        <StatCard
          title="Live Matches"
          value={stats.liveMatches}
          icon={Clock}
          color="bg-orange-500"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <QuickActionCard
            title="Create Tournament"
            description="Set up a new competitive tournament with custom rules and prizes"
            icon={Trophy}
            color="bg-yellow-500"
            onClick={() => console.log('Create Tournament clicked')}
          />
          <QuickActionCard
            title="Manage Users"
            description="View, edit, and manage user accounts and permissions"
            icon={Users}
            color="bg-blue-500"
            onClick={() => console.log('Manage Users clicked')}
          />
          <QuickActionCard
            title="Review Flags"
            description="Review and handle anti-cheat flags and reports"
            icon={AlertTriangle}
            color="bg-red-500"
            onClick={() => console.log('Review Flags clicked')}
          />
          <QuickActionCard
            title="Payment Overview"
            description="Monitor transactions, withdrawals, and financial reports"
            icon={DollarSign}
            color="bg-green-500"
            onClick={() => console.log('Payment Overview clicked')}
          />
          <QuickActionCard
            title="Match Management"
            description="Create, schedule, and manage individual matches"
            icon={Gamepad2}
            color="bg-purple-500"
            onClick={() => console.log('Match Management clicked')}
          />
          <QuickActionCard
            title="Analytics"
            description="View detailed analytics and performance metrics"
            icon={TrendingUp}
            color="bg-indigo-500"
            onClick={() => console.log('Analytics clicked')}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-sm text-gray-600">New tournament "Summer Championship" created</span>
              <span className="text-xs text-gray-400">2 hours ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-sm text-gray-600">User "GamerPro123" registered</span>
              <span className="text-xs text-gray-400">4 hours ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span className="text-sm text-gray-600">Match "BR_001" completed</span>
              <span className="text-xs text-gray-400">6 hours ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <span className="text-sm text-gray-600">Anti-cheat flag reported for user "Player456"</span>
              <span className="text-xs text-gray-400">8 hours ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
