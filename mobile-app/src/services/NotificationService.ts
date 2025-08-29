import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  data?: any;
  type?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  sound?: string;
  vibrate?: boolean;
  autoCancel?: boolean;
  largeIcon?: string;
  smallIcon?: string;
  bigText?: string;
  subText?: string;
  color?: string;
  number?: number;
  channelId?: string;
}

export interface NotificationChannel {
  id: string;
  name: string;
  description?: string;
  importance: number;
  sound?: string;
  vibrate?: boolean;
  light?: boolean;
  lightColor?: string;
}

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private notificationListeners: Map<string, (data: any) => void> = new Map();

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Configure push notification
      PushNotification.configure({
        // (optional) Called when Token is generated (iOS and Android)
        onRegister: async (token) => {
          console.log('Push notification token:', token);
          await this.saveDeviceToken(token);
        },

        // (required) Called when a remote or local notification is opened or received
        onNotification: (notification) => {
          console.log('Notification received:', notification);
          this.handleNotificationReceived(notification);
        },

        // (optional) Called when the user fails to register for remote notifications
        onRegistrationError: (err) => {
          console.error('Failed to register for push notifications:', err);
        },

        // IOS ONLY (optional): default: all - Permissions to register
        permissions: {
          alert: true,
          badge: true,
          sound: true,
          critical: true,
          announcement: true,
        },

        // Should the initial notification be popped automatically
        popInitialNotification: true,

        /**
         * (optional) default: true
         * - false: Show notifications when app is in foreground
         * - true: Hide notifications when app is in foreground
         */
        requestPermissions: Platform.OS === 'ios',

        // For iOS, request permissions
        requestPermissions: true,
      });

      // Create notification channels for Android
      if (Platform.OS === 'android') {
        this.createNotificationChannels();
      }

      // Configure local notifications
      PushNotification.createChannel(
        {
          channelId: 'default',
          channelName: 'Default Channel',
          channelDescription: 'Default notification channel',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        (created) => console.log(`Default channel created: ${created}`)
      );

      this.isInitialized = true;
      console.log('Notification service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  private createNotificationChannels(): void {
    const channels: NotificationChannel[] = [
      {
        id: 'tournaments',
        name: 'Tournaments',
        description: 'Tournament-related notifications',
        importance: 4,
        sound: 'default',
        vibrate: true,
      },
      {
        id: 'matches',
        name: 'Matches',
        description: 'Match-related notifications',
        importance: 5,
        sound: 'default',
        vibrate: true,
      },
      {
        id: 'social',
        name: 'Social',
        description: 'Social and friend-related notifications',
        importance: 3,
        sound: 'default',
        vibrate: false,
      },
      {
        id: 'payments',
        name: 'Payments',
        description: 'Payment and wallet notifications',
        importance: 4,
        sound: 'default',
        vibrate: true,
      },
      {
        id: 'security',
        name: 'Security',
        description: 'Security and anti-cheat notifications',
        importance: 5,
        sound: 'default',
        vibrate: true,
      },
    ];

    channels.forEach((channel) => {
      PushNotification.createChannel(
        {
          channelId: channel.id,
          channelName: channel.name,
          channelDescription: channel.description,
          playSound: true,
          soundName: channel.sound || 'default',
          importance: channel.importance,
          vibrate: channel.vibrate,
        },
        (created) => console.log(`Channel ${channel.id} created: ${created}`)
      );
    });
  }

  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const authStatus = await PushNotification.requestPermissions();
        return authStatus.alert || authStatus.badge || authStatus.sound;
      }
      return true; // Android permissions are handled in manifest
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  async checkPermissions(): Promise<boolean> {
    try {
      const authStatus = await PushNotification.checkPermissions();
      return authStatus.alert || authStatus.badge || authStatus.sound;
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return false;
    }
  }

  // Local notifications
  scheduleLocalNotification(notification: NotificationData, date: Date): void {
    try {
      PushNotification.localNotificationSchedule({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        date: date,
        channelId: notification.channelId || 'default',
        data: notification.data,
        soundName: notification.sound || 'default',
        vibrate: notification.vibrate !== false,
        autoCancel: notification.autoCancel !== false,
        largeIcon: notification.largeIcon,
        smallIcon: notification.smallIcon,
        bigText: notification.bigText,
        subText: notification.subText,
        color: notification.color,
        number: notification.number,
        repeatType: 'day', // Can be 'week', 'day', 'hour', 'minute'
      });
    } catch (error) {
      console.error('Error scheduling local notification:', error);
    }
  }

  showLocalNotification(notification: NotificationData): void {
    try {
      PushNotification.localNotification({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        channelId: notification.channelId || 'default',
        data: notification.data,
        soundName: notification.sound || 'default',
        vibrate: notification.vibrate !== false,
        autoCancel: notification.autoCancel !== false,
        largeIcon: notification.largeIcon,
        smallIcon: notification.smallIcon,
        bigText: notification.bigText,
        subText: notification.subText,
        color: notification.color,
        number: notification.number,
      });
    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  }

  // Cancel notifications
  cancelNotification(notificationId: string): void {
    try {
      PushNotification.cancelLocalNotification(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  cancelAllNotifications(): void {
    try {
      PushNotification.cancelAllLocalNotifications();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  // Clear delivered notifications
  clearDeliveredNotifications(): void {
    try {
      PushNotification.clearAllNotifications();
    } catch (error) {
      console.error('Error clearing delivered notifications:', error);
    }
  }

  // Get delivered notifications
  getDeliveredNotifications(): Promise<any[]> {
    return new Promise((resolve) => {
      PushNotification.getDeliveredNotifications((notifications) => {
        resolve(notifications || []);
      });
    });
  }

  // Get scheduled notifications
  getScheduledNotifications(): Promise<any[]> {
    return new Promise((resolve) => {
      PushNotification.getScheduledLocalNotifications((notifications) => {
        resolve(notifications || []);
      });
    });
  }

  // Notification listeners
  addNotificationListener(id: string, callback: (data: any) => void): void {
    this.notificationListeners.set(id, callback);
  }

  removeNotificationListener(id: string): void {
    this.notificationListeners.delete(id);
  }

  private handleNotificationReceived(notification: any): void {
    // Handle notification received while app is in foreground
    if (notification.userInteraction) {
      // User tapped on notification
      this.handleNotificationTap(notification);
    } else {
      // Notification received in foreground
      this.handleForegroundNotification(notification);
    }

    // Notify listeners
    this.notificationListeners.forEach((callback) => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  private handleNotificationTap(notification: any): void {
    console.log('Notification tapped:', notification);
    // Handle navigation or other actions based on notification data
    // This can be customized based on your app's navigation structure
  }

  private handleForegroundNotification(notification: any): void {
    console.log('Foreground notification:', notification);
    // Show in-app notification or update UI
  }

  // Device token management
  private async saveDeviceToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('deviceToken', token);
      // Here you would typically send the token to your backend
      console.log('Device token saved:', token);
    } catch (error) {
      console.error('Error saving device token:', error);
    }
  }

  async getDeviceToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('deviceToken');
    } catch (error) {
      console.error('Error getting device token:', error);
      return null;
    }
  }

  // Utility methods for common notification types
  showTournamentNotification(tournamentName: string, message: string, data?: any): void {
    this.showLocalNotification({
      id: `tournament-${Date.now()}`,
      title: `Tournament: ${tournamentName}`,
      message,
      channelId: 'tournaments',
      data,
      priority: 'high',
    });
  }

  showMatchNotification(matchNumber: string, message: string, data?: any): void {
    this.showLocalNotification({
      id: `match-${Date.now()}`,
      title: `Match ${matchNumber}`,
      message,
      channelId: 'matches',
      data,
      priority: 'high',
    });
  }

  showFriendRequestNotification(username: string, message: string, data?: any): void {
    this.showLocalNotification({
      id: `friend-${Date.now()}`,
      title: 'New Friend Request',
      message: `${username} ${message}`,
      channelId: 'social',
      data,
      priority: 'normal',
    });
  }

  showPaymentNotification(title: string, message: string, data?: any): void {
    this.showLocalNotification({
      id: `payment-${Date.now()}`,
      title,
      message,
      channelId: 'payments',
      data,
      priority: 'high',
    });
  }

  showSecurityNotification(title: string, message: string, data?: any): void {
    this.showLocalNotification({
      id: `security-${Date.now()}`,
      title,
      message,
      channelId: 'security',
      data,
      priority: 'urgent',
      vibrate: true,
    });
  }

  // Schedule tournament reminders
  scheduleTournamentReminder(tournamentId: string, tournamentName: string, startTime: Date): void {
    const reminderTime = new Date(startTime.getTime() - 5 * 60 * 1000); // 5 minutes before
    this.scheduleLocalNotification({
      id: `tournament-reminder-${tournamentId}`,
      title: 'Tournament Starting Soon',
      message: `${tournamentName} starts in 5 minutes!`,
      channelId: 'tournaments',
      data: { tournamentId, type: 'reminder' },
      priority: 'high',
    }, reminderTime);
  }

  // Schedule match reminders
  scheduleMatchReminder(matchId: string, matchNumber: string, startTime: Date): void {
    const reminderTime = new Date(startTime.getTime() - 2 * 60 * 1000); // 2 minutes before
    this.scheduleLocalNotification({
      id: `match-reminder-${matchId}`,
      title: 'Match Starting Soon',
      message: `Match ${matchNumber} starts in 2 minutes!`,
      channelId: 'matches',
      data: { matchId, type: 'reminder' },
      priority: 'high',
    }, reminderTime);
  }
}

export default NotificationService.getInstance();
