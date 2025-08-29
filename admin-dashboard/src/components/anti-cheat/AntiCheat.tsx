import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, CheckCircle, XCircle, AlertTriangle, Shield, Ban, Clock, User, Gamepad2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../../services/api';

interface AntiCheatFlag {
  _id: string;
  userId: string;
  username: string;
  matchId: string;
  matchName: string;
  gameType: string;
  detectionType: string;
  cheatType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  status: 'pending' | 'investigating' | 'resolved' | 'false_positive' | 'confirmed';
  evidence: Array<{
    type: string;
    description: string;
    timestamp: string;
    data?: any;
  }>;
  riskScore: number;
  actions: Array<{
    type: string;
    description: string;
    timestamp: string;
    adminId: string;
    adminName: string;
  }>;
  appeal?: {
    status: 'pending' | 'approved' | 'rejected';
    reason: string;
    submittedAt: string;
    reviewedAt?: string;
    reviewedBy?: string;
  };
  createdAt: string;
  updatedAt: string;
}

const AntiCheat: React.FC = () => {
  const [flags, setFlags] = useState<AntiCheatFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlag, setSelectedFlag] = useState<AntiCheatFlag | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterCheatType, setFilterCheatType] = useState<string>('all');

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    try {
      const response = await api.get('/anti-cheat/flags');
      setFlags(response.data);
    } catch (error) {
      toast.error('Failed to fetch anti-cheat flags');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (flagId: string, newStatus: string) => {
    try {
      await api.put(`/anti-cheat/flags/${flagId}/status`, { status: newStatus });
      toast.success(`Flag status updated to ${newStatus}`);
      fetchFlags();
    } catch (error) {
      toast.error('Failed to update flag status');
    }
  };

  const handleAction = async (flagId: string, actionType: string, description: string) => {
    try {
      await api.post(`/anti-cheat/flags/${flagId}/actions`, {
        type: actionType,
        description: description
      });
      toast.success('Action recorded successfully');
      fetchFlags();
    } catch (error) {
      toast.error('Failed to record action');
    }
  };

  const handleAppealReview = async (flagId: string, decision: string, reason: string) => {
    try {
      await api.put(`/anti-cheat/flags/${flagId}/appeal`, {
        status: decision,
        reviewReason: reason
      });
      toast.success(`Appeal ${decision}`);
      fetchFlags();
    } catch (error) {
      toast.error('Failed to review appeal');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'investigating': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'false_positive': return 'bg-gray-100 text-gray-800';
      case 'confirmed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-red-600';
    if (confidence >= 70) return 'text-orange-600';
    if (confidence >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 60) return 'text-orange-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  const filteredFlags = flags.filter(flag => {
    const matchesSearch = flag.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         flag.matchName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || flag.status === filterStatus;
    const matchesSeverity = filterSeverity === 'all' || flag.severity === filterSeverity;
    const matchesCheatType = filterCheatType === 'all' || flag.cheatType === filterCheatType;
    
    return matchesSearch && matchesStatus && matchesSeverity && matchesCheatType;
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
        <h1 className="text-2xl font-bold text-gray-900">Anti-Cheat Management</h1>
        <div className="text-sm text-gray-600">
          Total Flags: {flags.length} | Pending: {flags.filter(f => f.status === 'pending').length}
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
                placeholder="Search by username or match..."
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
              <option value="pending">Pending</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="false_positive">False Positive</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Severity</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cheat Type</label>
            <select
              value={filterCheatType}
              onChange={(e) => setFilterCheatType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Types</option>
              <option value="aimbot">Aimbot</option>
              <option value="wallhack">Wallhack</option>
              <option value="speedhack">Speedhack</option>
              <option value="macros">Macros</option>
              <option value="team_killing">Team Killing</option>
              <option value="griefing">Griefing</option>
            </select>
          </div>
        </div>
      </div>

      {/* Flags Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFlags.map((flag) => (
          <div key={flag._id} className="bg-white rounded-lg shadow-md p-6 border">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{flag.username}</h3>
                <p className="text-sm text-gray-600">{flag.matchName}</p>
                <p className="text-sm text-gray-500">{flag.gameType}</p>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(flag.severity)}`}>
                  {flag.severity}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(flag.status)}`}>
                  {flag.status}
                </span>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Gamepad2 size={16} />
                <span>{flag.cheatType}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <AlertTriangle size={16} />
                <span>Confidence: <span className={getConfidenceColor(flag.confidence)}>{flag.confidence}%</span></span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Shield size={16} />
                <span>Risk: <span className={getRiskScoreColor(flag.riskScore)}>{flag.riskScore}/100</span></span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock size={16} />
                <span>{new Date(flag.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedFlag(flag);
                  setShowDetailsModal(true);
                }}
                className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded-md text-sm hover:bg-blue-200 flex items-center justify-center gap-1"
              >
                <Eye size={16} />
                Details
              </button>
              {flag.status === 'pending' && (
                <button
                  onClick={() => handleStatusUpdate(flag._id, 'investigating')}
                  className="flex-1 bg-yellow-100 text-yellow-700 px-3 py-2 rounded-md text-sm hover:bg-yellow-200 flex items-center justify-center gap-1"
                >
                  Investigate
                </button>
              )}
              {flag.status === 'investigating' && (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleStatusUpdate(flag._id, 'resolved')}
                    className="flex-1 bg-green-100 text-green-700 px-2 py-2 rounded-md text-sm hover:bg-green-200 flex items-center justify-center"
                    title="Resolve"
                  >
                    <CheckCircle size={16} />
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(flag._id, 'false_positive')}
                    className="flex-1 bg-gray-100 text-gray-700 px-2 py-2 rounded-md text-sm hover:bg-gray-200 flex items-center justify-center"
                    title="False Positive"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Flag Details Modal */}
      {showDetailsModal && selectedFlag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Anti-Cheat Flag Details</h2>
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
                  <p><span className="font-medium">Player:</span> {selectedFlag.username}</p>
                  <p><span className="font-medium">Match:</span> {selectedFlag.matchName}</p>
                  <p><span className="font-medium">Game Type:</span> {selectedFlag.gameType}</p>
                  <p><span className="font-medium">Detection Type:</span> {selectedFlag.detectionType}</p>
                  <p><span className="font-medium">Cheat Type:</span> {selectedFlag.cheatType}</p>
                  <p><span className="font-medium">Severity:</span> 
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getSeverityColor(selectedFlag.severity)}`}>
                      {selectedFlag.severity}
                    </span>
                  </p>
                  <p><span className="font-medium">Status:</span> 
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusColor(selectedFlag.status)}`}>
                      {selectedFlag.status}
                    </span>
                  </p>
                  <p><span className="font-medium">Confidence:</span> 
                    <span className={`ml-2 ${getConfidenceColor(selectedFlag.confidence)}`}>
                      {selectedFlag.confidence}%
                    </span>
                  </p>
                  <p><span className="font-medium">Risk Score:</span> 
                    <span className={`ml-2 ${getRiskScoreColor(selectedFlag.riskScore)}`}>
                      {selectedFlag.riskScore}/100
                    </span>
                  </p>
                  <p><span className="font-medium">Created:</span> {new Date(selectedFlag.createdAt).toLocaleString()}</p>
                  <p><span className="font-medium">Updated:</span> {new Date(selectedFlag.updatedAt).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Evidence</h3>
                <div className="space-y-2">
                  {selectedFlag.evidence.map((evidence, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded border">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{evidence.type}</p>
                          <p className="text-sm text-gray-600">{evidence.description}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(evidence.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold mb-2">Actions Taken</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                {selectedFlag.actions.length > 0 ? (
                  <div className="space-y-2">
                    {selectedFlag.actions.map((action, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                        <div>
                          <span className="font-medium text-sm">{action.type}</span>
                          <p className="text-sm text-gray-600">{action.description}</p>
                          <p className="text-xs text-gray-500">by {action.adminName}</p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(action.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No actions taken yet</p>
                )}
                
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleAction(selectedFlag._id, 'warning', 'Warning issued to player')}
                    className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-md text-sm hover:bg-yellow-200"
                  >
                    Issue Warning
                  </button>
                  <button
                    onClick={() => handleAction(selectedFlag._id, 'suspension', 'Player suspended temporarily')}
                    className="px-3 py-1 bg-orange-100 text-orange-700 rounded-md text-sm hover:bg-orange-200"
                  >
                    Suspend Player
                  </button>
                  <button
                    onClick={() => handleAction(selectedFlag._id, 'ban', 'Player permanently banned')}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200"
                  >
                    Ban Player
                  </button>
                </div>
              </div>
            </div>

            {selectedFlag.appeal && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Appeal Information</h3>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="space-y-2">
                    <p><span className="font-medium">Status:</span> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                        selectedFlag.appeal.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        selectedFlag.appeal.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {selectedFlag.appeal.status}
                      </span>
                    </p>
                    <p><span className="font-medium">Reason:</span> {selectedFlag.appeal.reason}</p>
                    <p><span className="font-medium">Submitted:</span> {new Date(selectedFlag.appeal.submittedAt).toLocaleString()}</p>
                    {selectedFlag.appeal.reviewedAt && (
                      <p><span className="font-medium">Reviewed:</span> {new Date(selectedFlag.appeal.reviewedAt).toLocaleString()}</p>
                    )}
                    {selectedFlag.appeal.reviewedBy && (
                      <p><span className="font-medium">Reviewed By:</span> {selectedFlag.appeal.reviewedBy}</p>
                    )}
                  </div>
                  
                  {selectedFlag.appeal.status === 'pending' && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => handleAppealReview(selectedFlag._id, 'approved', 'Appeal approved after review')}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200"
                      >
                        Approve Appeal
                      </button>
                      <button
                        onClick={() => handleAppealReview(selectedFlag._id, 'rejected', 'Appeal rejected after review')}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200"
                      >
                        Reject Appeal
                      </button>
                    </div>
                  )}
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

export default AntiCheat;
