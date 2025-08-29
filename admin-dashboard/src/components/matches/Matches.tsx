import React, { useState, useEffect } from 'react';
import { Eye, Play, Square, AlertTriangle, Users, Trophy, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../../services/api';

interface Match {
  _id: string;
  tournamentId: string;
  tournamentName: string;
  gameType: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  startTime: string;
  endTime?: string;
  participants: Array<{
    userId: string;
    username: string;
    score?: number;
    rank?: number;
  }>;
  maxParticipants: number;
  entryFee: number;
  prizeDistribution: Array<{
    rank: number;
    amount: number;
    percentage: number;
  }>;
  antiCheatFlags: Array<{
    userId: string;
    username: string;
    flagType: string;
    severity: string;
    status: string;
  }>;
  technicalIssues: Array<{
    description: string;
    status: string;
    reportedAt: string;
  }>;
  chatLogs: Array<{
    userId: string;
    username: string;
    message: string;
    timestamp: string;
  }>;
  createdAt: string;
}

const Matches: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await api.get('/matches');
      setMatches(response.data);
    } catch (error) {
      toast.error('Failed to fetch matches');
    } finally {
      setLoading(false);
    }
  };

  const handleStartMatch = async (matchId: string) => {
    try {
      await api.put(`/matches/${matchId}/start`);
      toast.success('Match started successfully');
      fetchMatches();
    } catch (error) {
      toast.error('Failed to start match');
    }
  };

  const handleEndMatch = async (matchId: string) => {
    try {
      await api.put(`/matches/${matchId}/end`);
      toast.success('Match ended successfully');
      fetchMatches();
    } catch (error) {
      toast.error('Failed to end match');
    }
  };

  const handleCancelMatch = async (matchId: string) => {
    if (!confirm('Are you sure you want to cancel this match?')) return;
    
    try {
      await api.put(`/matches/${matchId}/cancel`);
      toast.success('Match cancelled successfully');
      fetchMatches();
    } catch (error) {
      toast.error('Failed to cancel match');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getGameTypeLabel = (gameType: string) => {
    switch (gameType) {
      case 'BR_MATCH': return 'BR Match';
      case 'CLASH_SQUAD': return 'Clash Squad';
      case 'LONE_WOLF': return 'Lone Wolf';
      case 'CS_2_VS_2': return 'CS 2 vs 2';
      default: return gameType;
    }
  };

  const filteredMatches = matches.filter(match => 
    filterStatus === 'all' || match.status === filterStatus
  );

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
        <h1 className="text-2xl font-bold text-gray-900">Match Management</h1>
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Matches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMatches.map((match) => (
          <div key={match._id} className="bg-white rounded-lg shadow-md p-6 border">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{match.tournamentName}</h3>
                <p className="text-sm text-gray-600">{getGameTypeLabel(match.gameType)}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
                {match.status}
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock size={16} />
                <span>{new Date(match.startTime).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users size={16} />
                <span>{match.participants.length}/{match.maxParticipants}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Trophy size={16} />
                <span>${match.prizeDistribution.reduce((sum, p) => sum + p.amount, 0)}</span>
              </div>
              {match.antiCheatFlags.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertTriangle size={16} />
                  <span>{match.antiCheatFlags.length} Anti-cheat flags</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedMatch(match);
                  setShowDetailsModal(true);
                }}
                className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded-md text-sm hover:bg-blue-200 flex items-center justify-center gap-1"
              >
                <Eye size={16} />
                Details
              </button>
              {match.status === 'upcoming' && (
                <button
                  onClick={() => handleStartMatch(match._id)}
                  className="flex-1 bg-green-100 text-green-700 px-3 py-2 rounded-md text-sm hover:bg-green-200 flex items-center justify-center gap-1"
                >
                  <Play size={16} />
                  Start
                </button>
              )}
              {match.status === 'active' && (
                <button
                  onClick={() => handleEndMatch(match._id)}
                  className="flex-1 bg-yellow-100 text-yellow-700 px-3 py-2 rounded-md text-sm hover:bg-yellow-200 flex items-center justify-center gap-1"
                >
                  <Square size={16} />
                  End
                </button>
              )}
              {(match.status === 'upcoming' || match.status === 'active') && (
                <button
                  onClick={() => handleCancelMatch(match._id)}
                  className="flex-1 bg-red-100 text-red-700 px-3 py-2 rounded-md text-sm hover:bg-red-200 flex items-center justify-center gap-1"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Match Details Modal */}
      {showDetailsModal && selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Match Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Basic Information</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Tournament:</span> {selectedMatch.tournamentName}</p>
                  <p><span className="font-medium">Game Type:</span> {getGameTypeLabel(selectedMatch.gameType)}</p>
                  <p><span className="font-medium">Status:</span> 
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusColor(selectedMatch.status)}`}>
                      {selectedMatch.status}
                    </span>
                  </p>
                  <p><span className="font-medium">Start Time:</span> {new Date(selectedMatch.startTime).toLocaleString()}</p>
                  {selectedMatch.endTime && (
                    <p><span className="font-medium">End Time:</span> {new Date(selectedMatch.endTime).toLocaleString()}</p>
                  )}
                  <p><span className="font-medium">Entry Fee:</span> ${selectedMatch.entryFee}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Prize Distribution</h3>
                <div className="space-y-2">
                  {selectedMatch.prizeDistribution.map((prize, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{prize.rank === 1 ? '🥇' : prize.rank === 2 ? '🥈' : prize.rank === 3 ? '🥉' : `${prize.rank}th`}</span>
                      <span>${prize.amount}</span>
                      <span>({prize.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold mb-2">Participants</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-600 mb-2">
                  <span>Username</span>
                  <span>Score</span>
                  <span>Rank</span>
                </div>
                {selectedMatch.participants.map((participant, index) => (
                  <div key={index} className="grid grid-cols-3 gap-4 py-2 border-b border-gray-200 last:border-b-0">
                    <span>{participant.username}</span>
                    <span>{participant.score || '-'}</span>
                    <span>{participant.rank || '-'}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedMatch.antiCheatFlags.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2 text-red-600">Anti-Cheat Flags</h3>
                <div className="bg-red-50 rounded-lg p-4">
                  {selectedMatch.antiCheatFlags.map((flag, index) => (
                    <div key={index} className="mb-3 p-3 bg-white rounded border-l-4 border-red-500">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{flag.username}</p>
                          <p className="text-sm text-gray-600">Type: {flag.flagType}</p>
                          <p className="text-sm text-gray-600">Severity: {flag.severity}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          flag.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          flag.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {flag.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedMatch.technicalIssues.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2 text-orange-600">Technical Issues</h3>
                <div className="bg-orange-50 rounded-lg p-4">
                  {selectedMatch.technicalIssues.map((issue, index) => (
                    <div key={index} className="mb-3 p-3 bg-white rounded border-l-4 border-orange-500">
                      <p className="text-sm">{issue.description}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">
                          {new Date(issue.reportedAt).toLocaleString()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          issue.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {issue.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedMatch.chatLogs.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Chat Logs</h3>
                <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                  {selectedMatch.chatLogs.map((log, index) => (
                    <div key={index} className="mb-2 text-sm">
                      <span className="font-medium text-blue-600">{log.username}:</span>
                      <span className="ml-2">{log.message}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

export default Matches;
