import { io, Socket } from 'socket.io-client';
import NotificationService from './NotificationService';
import { useAuth } from '../context/AuthContext';

export interface RealTimeEvent {
  type: string;
  data: any;
  timestamp: Date;
}

export interface MatchUpdate {
  matchId: string;
  matchNumber: string;
  status: string;
  scores?: any;
  participants?: any[];
  startTime?: Date;
  endTime?: Date;
}

export interface TournamentUpdate {
  tournamentId: string;
  name: string;
  status: string;
  startTime?: Date;
  endTime?: Date;
  participantCount?: number;
  maxParticipants?: number;
}

export interface SocialUpdate {
  type: 'friend_request' | 'friend_accepted' | 'friend_rejected' | 'message' | 'achievement';
  fromUserId?: string;
  fromUsername?: string;
  message?: string;
  data?: any;
}

export interface PaymentUpdate {
  type: 'deposit' | 'withdrawal' | 'transaction' | 'wallet_update';
  amount?: number;
  status: string;
  transactionId?: string;
  message?: string;
}

export interface AntiCheatUpdate {
  type: 'flag' | 'warning' | 'ban' | 'appeal';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  matchId?: string;
  data?: any;
}

class RealTimeService {
  private static instance: RealTimeService;
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventListeners: Map<string, ((data: any) => void)[]> = new Map();
  private user: any = null;

  private constructor() {}

  static getInstance(): RealTimeService {
    if (!RealTimeService.instance) {
      RealTimeService.instance = new RealTimeService();
    }
    return RealTimeService.instance;
  }

  setUser(user: any): void {
    this.user = user;
  }

  async connect(baseURL: string = process.env.API_BASE_URL || 'http://localhost:3001'): Promise<void> {
    if (this.socket && this.isConnected) return;

    try {
      this.socket = io(baseURL, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: this.reconnectDelay,
        reconnectionAttempts: this.maxReconnectAttempts,
        timeout: 20000,
      });

      this.setupSocketEventHandlers();
      this.setupReconnectionLogic();
    } catch (error) {
      console.error('Failed to connect to real-time service:', error);
      throw error;
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  private setupSocketEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Real-time service connected:', this.socket?.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Join user room if authenticated
      if (this.user?._id) {
        this.joinUserRoom(this.user._id);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Real-time service disconnected:', reason);
      this.isConnected = false;
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Real-time service connection error:', error);
      this.isConnected = false;
    });

    // Match-related events
    this.socket.on('match-update', (data: MatchUpdate) => {
      console.log('Match update received:', data);
      this.handleMatchUpdate(data);
      this.emitToListeners('match-update', data);
    });

    this.socket.on('match-started', (data: MatchUpdate) => {
      console.log('Match started:', data);
      NotificationService.showMatchNotification(
        data.matchNumber,
        'Match has started!',
        { matchId: data.matchId, type: 'started' }
      );
      this.emitToListeners('match-started', data);
    });

    this.socket.on('match-ended', (data: MatchUpdate) => {
      console.log('Match ended:', data);
      NotificationService.showMatchNotification(
        data.matchNumber,
        'Match has ended!',
        { matchId: data.matchId, type: 'ended' }
      );
      this.emitToListeners('match-ended', data);
    });

    this.socket.on('score-update', (data: any) => {
      console.log('Score update:', data);
      this.emitToListeners('score-update', data);
    });

    this.socket.on('participant-joined', (data: any) => {
      console.log('Participant joined:', data);
      this.emitToListeners('participant-joined', data);
    });

    this.socket.on('participant-left', (data: any) => {
      console.log('Participant left:', data);
      this.emitToListeners('participant-left', data);
    });

    // Tournament-related events
    this.socket.on('tournament-update', (data: TournamentUpdate) => {
      console.log('Tournament update:', data);
      this.handleTournamentUpdate(data);
      this.emitToListeners('tournament-update', data);
    });

    this.socket.on('tournament-starting', (data: TournamentUpdate) => {
      console.log('Tournament starting:', data);
      NotificationService.showTournamentNotification(
        data.name,
        'Tournament starts in 5 minutes!',
        { tournamentId: data.tournamentId, type: 'starting' }
      );
      this.emitToListeners('tournament-starting', data);
    });

    this.socket.on('tournament-registration', (data: any) => {
      console.log('Tournament registration:', data);
      this.emitToListeners('tournament-registration', data);
    });

    // Social events
    this.socket.on('friend-request-received', (data: SocialUpdate) => {
      console.log('Friend request received:', data);
      if (data.fromUsername) {
        NotificationService.showFriendRequestNotification(
          data.fromUsername,
          'sent you a friend request',
          { fromUserId: data.fromUserId, type: 'friend_request' }
        );
      }
      this.emitToListeners('friend-request-received', data);
    });

    this.socket.on('friend-request-updated', (data: SocialUpdate) => {
      console.log('Friend request updated:', data);
      this.emitToListeners('friend-request-updated', data);
    });

    this.socket.on('message-received', (data: SocialUpdate) => {
      console.log('Message received:', data);
      this.emitToListeners('message-received', data);
    });

    this.socket.on('achievement-unlocked', (data: SocialUpdate) => {
      console.log('Achievement unlocked:', data);
      NotificationService.showLocalNotification({
        id: `achievement-${Date.now()}`,
        title: 'Achievement Unlocked!',
        message: data.message || 'You unlocked a new achievement!',
        channelId: 'social',
        data: data.data,
        priority: 'normal',
      });
      this.emitToListeners('achievement-unlocked', data);
    });

    // Payment events
    this.socket.on('payment-update', (data: PaymentUpdate) => {
      console.log('Payment update:', data);
      this.handlePaymentUpdate(data);
      this.emitToListeners('payment-update', data);
    });

    this.socket.on('wallet-update', (data: any) => {
      console.log('Wallet update:', data);
      this.emitToListeners('wallet-update', data);
    });

    // Anti-cheat events
    this.socket.on('anti-cheat-alert', (data: AntiCheatUpdate) => {
      console.log('Anti-cheat alert:', data);
      NotificationService.showSecurityNotification(
        'Security Alert',
        data.message,
        { type: data.type, severity: data.severity, matchId: data.matchId }
      );
      this.emitToListeners('anti-cheat-alert', data);
    });

    this.socket.on('appeal-update', (data: any) => {
      console.log('Appeal update:', data);
      this.emitToListeners('appeal-update', data);
    });

    // Error handling
    this.socket.on('error', (error: any) => {
      console.error('Real-time service error:', error);
      this.emitToListeners('error', error);
    });
  }

  private setupReconnectionLogic(): void {
    if (!this.socket) return;

    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log('Real-time service reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Rejoin user room after reconnection
      if (this.user?._id) {
        this.joinUserRoom(this.user._id);
      }
    });

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log('Real-time service reconnection attempt:', attemptNumber);
      this.reconnectAttempts = attemptNumber;
    });

    this.socket.on('reconnect_error', (error: any) => {
      console.error('Real-time service reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Real-time service reconnection failed after', this.maxReconnectAttempts, 'attempts');
    });
  }

  // Room management
  joinMatch(matchId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-match', matchId);
      console.log('Joined match room:', matchId);
    }
  }

  leaveMatch(matchId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave-match', matchId);
      console.log('Left match room:', matchId);
    }
  }

  joinUserRoom(userId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-user-room', userId);
      console.log('Joined user room:', userId);
    }
  }

  leaveUserRoom(userId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave-user-room', userId);
      console.log('Left user room:', userId);
    }
  }

  joinTournamentRoom(tournamentId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-tournament', tournamentId);
      console.log('Joined tournament room:', tournamentId);
    }
  }

  leaveTournamentRoom(tournamentId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave-tournament', tournamentId);
      console.log('Left tournament room:', tournamentId);
    }
  }

  // Event listeners
  addEventListener(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }

  removeEventListener(event: string, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitToListeners(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  // Event handlers
  private handleMatchUpdate(data: MatchUpdate): void {
    // Handle different types of match updates
    switch (data.status) {
      case 'starting':
        // Schedule reminder for match start
        if (data.startTime) {
          NotificationService.scheduleMatchReminder(
            data.matchId,
            data.matchNumber,
            new Date(data.startTime)
          );
        }
        break;
      case 'in_progress':
        // Match is now active
        break;
      case 'completed':
        // Match finished
        break;
      default:
        break;
    }
  }

  private handleTournamentUpdate(data: TournamentUpdate): void {
    // Handle different types of tournament updates
    switch (data.status) {
      case 'registration_open':
        // Tournament registration is now open
        break;
      case 'registration_closed':
        // Tournament registration closed
        break;
      case 'starting':
        // Tournament is about to start
        if (data.startTime) {
          NotificationService.scheduleTournamentReminder(
            data.tournamentId,
            data.name,
            new Date(data.startTime)
          );
        }
        break;
      case 'in_progress':
        // Tournament is now active
        break;
      case 'completed':
        // Tournament finished
        break;
      default:
        break;
    }
  }

  private handlePaymentUpdate(data: PaymentUpdate): void {
    // Handle different types of payment updates
    switch (data.type) {
      case 'deposit':
        if (data.status === 'completed') {
          NotificationService.showPaymentNotification(
            'Deposit Successful',
            `Your deposit of $${data.amount} has been processed successfully.`,
            { transactionId: data.transactionId, type: 'deposit' }
          );
        }
        break;
      case 'withdrawal':
        if (data.status === 'completed') {
          NotificationService.showPaymentNotification(
            'Withdrawal Successful',
            `Your withdrawal of $${data.amount} has been processed successfully.`,
            { transactionId: data.transactionId, type: 'withdrawal' }
          );
        } else if (data.status === 'rejected') {
          NotificationService.showPaymentNotification(
            'Withdrawal Rejected',
            data.message || 'Your withdrawal request has been rejected.',
            { transactionId: data.transactionId, type: 'withdrawal' }
          );
        }
        break;
      default:
        break;
    }
  }

  // Utility methods
  isConnected(): boolean {
    return this.isConnected;
  }

  getConnectionStatus(): string {
    if (this.isConnected) return 'connected';
    if (this.reconnectAttempts > 0) return 'reconnecting';
    return 'disconnected';
  }

  // Send custom events
  sendEvent(event: string, data: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    }
  }

  // Get socket instance (for advanced usage)
  getSocket(): Socket | null {
    return this.socket;
  }
}

export default RealTimeService.getInstance();
