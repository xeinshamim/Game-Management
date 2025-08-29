import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Alert } from 'react-native';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinMatch: (matchId: string) => void;
  leaveMatch: (matchId: string) => void;
  joinUserRoom: () => void;
  leaveUserRoom: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      initializeSocket();
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, user]);

  const initializeSocket = () => {
    try {
      // Connect to the main socket server (match-scoring service)
      const socket = io(process.env.API_BASE_URL || 'http://localhost:3001', {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      socketRef.current = socket;

      // Connection events
      socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
        setIsConnected(true);
        
        // Join user's personal room for notifications
        if (user?._id) {
          socket.emit('join-user-room', user._id);
        }
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      // Match-related events
      socket.on('match-update', (data) => {
        console.log('Match update received:', data);
        // Handle match updates (score changes, status changes, etc.)
      });

      socket.on('match-started', (data) => {
        console.log('Match started:', data);
        Alert.alert('Match Started', `Match ${data.matchNumber} has begun!`);
      });

      socket.on('match-ended', (data) => {
        console.log('Match ended:', data);
        Alert.alert('Match Ended', `Match ${data.matchNumber} has finished!`);
      });

      socket.on('score-update', (data) => {
        console.log('Score update:', data);
        // Handle real-time score updates
      });

      socket.on('participant-joined', (data) => {
        console.log('Participant joined:', data);
        // Handle participant updates
      });

      socket.on('participant-left', (data) => {
        console.log('Participant left:', data);
        // Handle participant updates
      });

      // Tournament-related events
      socket.on('tournament-update', (data) => {
        console.log('Tournament update:', data);
        // Handle tournament updates
      });

      socket.on('tournament-starting', (data) => {
        console.log('Tournament starting:', data);
        Alert.alert('Tournament Starting', `${data.name} starts in 5 minutes!`);
      });

      // Social events
      socket.on('friend-request-received', (data) => {
        console.log('Friend request received:', data);
        Alert.alert('New Friend Request', `${data.fromUsername} sent you a friend request!`);
      });

      socket.on('friend-request-updated', (data) => {
        console.log('Friend request updated:', data);
        // Handle friend request responses
      });

      // Anti-cheat events
      socket.on('anti-cheat-alert', (data) => {
        console.log('Anti-cheat alert:', data);
        Alert.alert('Security Alert', 'Suspicious activity detected in your match.');
      });

      // Error handling
      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

    } catch (error) {
      console.error('Failed to initialize socket:', error);
    }
  };

  const disconnectSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  };

  const joinMatch = (matchId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('join-match', matchId);
      console.log('Joined match room:', matchId);
    }
  };

  const leaveMatch = (matchId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('leave-match', matchId);
      console.log('Left match room:', matchId);
    }
  };

  const joinUserRoom = () => {
    if (socketRef.current && isConnected && user?._id) {
      socketRef.current.emit('join-user-room', user._id);
      console.log('Joined user room:', user._id);
    }
  };

  const leaveUserRoom = () => {
    if (socketRef.current && isConnected && user?._id) {
      socketRef.current.emit('leave-user-room', user._id);
      console.log('Left user room:', user._id);
    }
  };

  const value: SocketContextType = {
    socket: socketRef.current,
    isConnected,
    joinMatch,
    leaveMatch,
    joinUserRoom,
    leaveUserRoom,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
