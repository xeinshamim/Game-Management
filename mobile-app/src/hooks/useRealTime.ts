import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import RealTimeService from '../services/RealTimeService';
import { useAuth } from '../context/AuthContext';
import {
  MatchUpdate,
  TournamentUpdate,
  SocialUpdate,
  PaymentUpdate,
  AntiCheatUpdate,
} from '../services/RealTimeService';

export const useRealTime = () => {
  const { socket, isConnected, joinMatch, leaveMatch, joinUserRoom, leaveUserRoom } = useSocket();
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Real-time data states
  const [matchUpdates, setMatchUpdates] = useState<MatchUpdate[]>([]);
  const [tournamentUpdates, setTournamentUpdates] = useState<TournamentUpdate[]>([]);
  const [socialUpdates, setSocialUpdates] = useState<SocialUpdate[]>([]);
  const [paymentUpdates, setPaymentUpdates] = useState<PaymentUpdate[]>([]);
  const [antiCheatUpdates, setAntiCheatUpdates] = useState<AntiCheatUpdate[]>([]);

  // Update connection status when socket changes
  useEffect(() => {
    setConnectionStatus(isConnected ? 'connected' : 'disconnected');
  }, [isConnected]);

  // Initialize real-time service with user
  useEffect(() => {
    if (user) {
      RealTimeService.setUser(user);
    }
  }, [user]);

  // Connect to real-time service when user is authenticated
  useEffect(() => {
    if (user && !isConnected) {
      connectToRealTimeService();
    }
  }, [user, isConnected]);

  const connectToRealTimeService = useCallback(async () => {
    try {
      await RealTimeService.connect();
    } catch (error) {
      console.error('Failed to connect to real-time service:', error);
    }
  }, []);

  // Event listeners for real-time updates
  useEffect(() => {
    if (!isConnected) return;

    // Match updates
    RealTimeService.addEventListener('match-update', (data: MatchUpdate) => {
      setMatchUpdates(prev => [data, ...prev.slice(0, 9)]); // Keep last 10 updates
      setLastUpdate(new Date());
    });

    RealTimeService.addEventListener('match-started', (data: MatchUpdate) => {
      setMatchUpdates(prev => [data, ...prev.slice(0, 9)]);
      setLastUpdate(new Date());
    });

    RealTimeService.addEventListener('match-ended', (data: MatchUpdate) => {
      setMatchUpdates(prev => [data, ...prev.slice(0, 9)]);
      setLastUpdate(new Date());
    });

    RealTimeService.addEventListener('score-update', (data: any) => {
      setMatchUpdates(prev => [data, ...prev.slice(0, 9)]);
      setLastUpdate(new Date());
    });

    // Tournament updates
    RealTimeService.addEventListener('tournament-update', (data: TournamentUpdate) => {
      setTournamentUpdates(prev => [data, ...prev.slice(0, 9)]);
      setLastUpdate(new Date());
    });

    RealTimeService.addEventListener('tournament-starting', (data: TournamentUpdate) => {
      setTournamentUpdates(prev => [data, ...prev.slice(0, 9)]);
      setLastUpdate(new Date());
    });

    // Social updates
    RealTimeService.addEventListener('friend-request-received', (data: SocialUpdate) => {
      setSocialUpdates(prev => [data, ...prev.slice(0, 9)]);
      setLastUpdate(new Date());
    });

    RealTimeService.addEventListener('friend-request-updated', (data: SocialUpdate) => {
      setSocialUpdates(prev => [data, ...prev.slice(0, 9)]);
      setLastUpdate(new Date());
    });

    RealTimeService.addEventListener('message-received', (data: SocialUpdate) => {
      setSocialUpdates(prev => [data, ...prev.slice(0, 9)]);
      setLastUpdate(new Date());
    });

    // Payment updates
    RealTimeService.addEventListener('payment-update', (data: PaymentUpdate) => {
      setPaymentUpdates(prev => [data, ...prev.slice(0, 9)]);
      setLastUpdate(new Date());
    });

    RealTimeService.addEventListener('wallet-update', (data: any) => {
      setPaymentUpdates(prev => [data, ...prev.slice(0, 9)]);
      setLastUpdate(new Date());
    });

    // Anti-cheat updates
    RealTimeService.addEventListener('anti-cheat-alert', (data: AntiCheatUpdate) => {
      setAntiCheatUpdates(prev => [data, ...prev.slice(0, 9)]);
      setLastUpdate(new Date());
    });

    // Error handling
    RealTimeService.addEventListener('error', (error: any) => {
      console.error('Real-time service error:', error);
    });

    // Cleanup function
    return () => {
      RealTimeService.removeEventListener('match-update', () => {});
      RealTimeService.removeEventListener('match-started', () => {});
      RealTimeService.removeEventListener('match-ended', () => {});
      RealTimeService.removeEventListener('score-update', () => {});
      RealTimeService.removeEventListener('tournament-update', () => {});
      RealTimeService.removeEventListener('tournament-starting', () => {});
      RealTimeService.removeEventListener('friend-request-received', () => {});
      RealTimeService.removeEventListener('friend-request-updated', () => {});
      RealTimeService.addEventListener('message-received', () => {});
      RealTimeService.removeEventListener('payment-update', () => {});
      RealTimeService.removeEventListener('wallet-update', () => {});
      RealTimeService.removeEventListener('anti-cheat-alert', () => {});
      RealTimeService.removeEventListener('error', () => {});
    };
  }, [isConnected]);

  // Utility functions
  const clearUpdates = useCallback((type: 'match' | 'tournament' | 'social' | 'payment' | 'anti-cheat' | 'all') => {
    switch (type) {
      case 'match':
        setMatchUpdates([]);
        break;
      case 'tournament':
        setTournamentUpdates([]);
        break;
      case 'social':
        setSocialUpdates([]);
        break;
      case 'payment':
        setPaymentUpdates([]);
        break;
      case 'anti-cheat':
        setAntiCheatUpdates([]);
        break;
      case 'all':
        setMatchUpdates([]);
        setTournamentUpdates([]);
        setSocialUpdates([]);
        setPaymentUpdates([]);
        setAntiCheatUpdates([]);
        break;
    }
  }, []);

  const getUpdateCount = useCallback((type: 'match' | 'tournament' | 'social' | 'payment' | 'anti-cheat') => {
    switch (type) {
      case 'match':
        return matchUpdates.length;
      case 'tournament':
        return tournamentUpdates.length;
      case 'social':
        return socialUpdates.length;
      case 'payment':
        return paymentUpdates.length;
      case 'anti-cheat':
        return antiCheatUpdates.length;
      default:
        return 0;
    }
  }, [matchUpdates, tournamentUpdates, socialUpdates, paymentUpdates, antiCheatUpdates]);

  const getLatestUpdate = useCallback((type: 'match' | 'tournament' | 'social' | 'payment' | 'anti-cheat') => {
    switch (type) {
      case 'match':
        return matchUpdates[0] || null;
      case 'tournament':
        return tournamentUpdates[0] || null;
      case 'social':
        return socialUpdates[0] || null;
      case 'payment':
        return paymentUpdates[0] || null;
      case 'anti-cheat':
        return antiCheatUpdates[0] || null;
      default:
        return null;
    }
  }, [matchUpdates, tournamentUpdates, socialUpdates, paymentUpdates, antiCheatUpdates]);

  // Enhanced room management with automatic cleanup
  const enhancedJoinMatch = useCallback((matchId: string) => {
    joinMatch(matchId);
    
    // Automatically leave other match rooms if needed
    // This could be enhanced based on your app's requirements
    return () => {
      leaveMatch(matchId);
    };
  }, [joinMatch, leaveMatch]);

  const enhancedJoinTournament = useCallback((tournamentId: string) => {
    RealTimeService.joinTournamentRoom(tournamentId);
    
    return () => {
      RealTimeService.leaveTournamentRoom(tournamentId);
    };
  }, []);

  // Connection management
  const reconnect = useCallback(async () => {
    try {
      await connectToRealTimeService();
    } catch (error) {
      console.error('Failed to reconnect:', error);
    }
  }, [connectToRealTimeService]);

  const disconnect = useCallback(() => {
    RealTimeService.disconnect();
  }, []);

  return {
    // Connection status
    isConnected,
    connectionStatus,
    lastUpdate,
    
    // Real-time data
    matchUpdates,
    tournamentUpdates,
    socialUpdates,
    paymentUpdates,
    antiCheatUpdates,
    
    // Room management
    joinMatch: enhancedJoinMatch,
    leaveMatch,
    joinUserRoom,
    leaveUserRoom,
    joinTournament: enhancedJoinTournament,
    
    // Utility functions
    clearUpdates,
    getUpdateCount,
    getLatestUpdate,
    
    // Connection management
    reconnect,
    disconnect,
    
    // Socket instance (for advanced usage)
    socket,
  };
};
