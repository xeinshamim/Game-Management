import React, { useRef, useEffect } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'react-native';
import { ThemeProvider } from 'react-native-elements';

// Import screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import HomeScreen from './src/screens/main/HomeScreen';
import TournamentsScreen from './src/screens/main/TournamentsScreen';
import MatchesScreen from './src/screens/main/MatchesScreen';
import ProfileScreen from './src/screens/main/ProfileScreen';
import WalletScreen from './src/screens/main/WalletScreen';
import FriendsScreen from './src/screens/main/FriendsScreen';
import LeaderboardScreen from './src/screens/main/LeaderboardScreen';
import NotificationsScreen from './src/screens/main/NotificationsScreen';
import OfflineManagementScreen from './src/screens/main/OfflineManagementScreen';

// Import components
import TabBarIcon from './src/components/common/TabBarIcon';
import ErrorBoundary from './src/components/common/ErrorBoundary';

// Import context
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';

// Import services
import DeepLinkingService from './src/services/DeepLinkingService';
import OfflineStorageService from './src/services/OfflineStorageService';
import ErrorHandlingService from './src/services/ErrorHandlingService';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Main tab navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => (
          <TabBarIcon route={route.name} focused={focused} color={color} size={size} />
        ),
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Tournaments" component={TournamentsScreen} />
      <Tab.Screen name="Matches" component={MatchesScreen} />
      <Tab.Screen name="Friends" component={FriendsScreen} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Offline" component={OfflineManagementScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// Auth stack navigator
const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};

// Main app navigator with deep linking support
const AppNavigator = () => {
  const { isAuthenticated } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  // Initialize deep linking service
  useEffect(() => {
    if (navigationRef.current) {
      DeepLinkingService.initialize(navigationRef.current);
    }
  }, []);

  // Cleanup services on unmount
  useEffect(() => {
    return () => {
      DeepLinkingService.destroy();
      OfflineStorageService.destroy();
      ErrorHandlingService.destroy();
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {isAuthenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
};

// App component with providers and error boundary
const App = () => {
  const theme = {
    colors: {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textSecondary: '#64748b',
    },
  };

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <SocketProvider>
            <AppNavigator />
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
