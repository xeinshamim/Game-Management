import { useEffect, useState } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import NotificationService from '../services/NotificationService';
import { useAuth } from '../context/AuthContext';

export const useNotificationSetup = () => {
  const { user, isAuthenticated } = useAuth();
  const [notificationPermission, setNotificationPermission] = useState<boolean | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      initializeNotifications();
    }
  }, [isAuthenticated, user]);

  const initializeNotifications = async () => {
    try {
      // Initialize the notification service
      await NotificationService.initialize();
      setIsInitialized(true);

      // Check current permission status
      const hasPermission = await NotificationService.checkPermissions();
      setNotificationPermission(hasPermission);

      // If no permission, request it
      if (!hasPermission) {
        await requestNotificationPermission();
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  };

  const requestNotificationPermission = async () => {
    try {
      if (Platform.OS === 'ios') {
        const granted = await NotificationService.requestPermissions();
        setNotificationPermission(granted);
        
        if (!granted) {
          showPermissionAlert();
        }
      } else {
        // For Android, permissions are handled in the manifest
        // But we can still check if they're granted
        const hasPermission = await NotificationService.checkPermissions();
        setNotificationPermission(hasPermission);
        
        if (!hasPermission) {
          showPermissionAlert();
        }
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      setNotificationPermission(false);
    }
  };

  const showPermissionAlert = () => {
    Alert.alert(
      'Notification Permission Required',
      'To receive important updates about tournaments, matches, and friend requests, please enable notifications in your device settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          },
        },
      ]
    );
  };

  const showTestNotification = () => {
    if (notificationPermission) {
      NotificationService.showLocalNotification({
        id: 'test-notification',
        title: 'Test Notification',
        message: 'This is a test notification to verify the setup is working correctly.',
        channelId: 'default',
        priority: 'normal',
      });
    } else {
      Alert.alert('Permission Required', 'Please enable notifications to test this feature.');
    }
  };

  const scheduleTestReminder = () => {
    if (notificationPermission) {
      const futureTime = new Date(Date.now() + 10 * 1000); // 10 seconds from now
      NotificationService.scheduleLocalNotification({
        id: 'test-reminder',
        title: 'Test Reminder',
        message: 'This is a test reminder scheduled for 10 seconds from now.',
        channelId: 'default',
        priority: 'normal',
      }, futureTime);
      
      Alert.alert('Test Reminder', 'A test reminder has been scheduled for 10 seconds from now.');
    } else {
      Alert.alert('Permission Required', 'Please enable notifications to test this feature.');
    }
  };

  return {
    notificationPermission,
    isInitialized,
    requestNotificationPermission,
    showTestNotification,
    scheduleTestReminder,
  };
};
