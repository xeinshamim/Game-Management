import { Linking, Alert } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';

export interface DeepLinkData {
  type: 'tournament' | 'match' | 'profile' | 'wallet' | 'leaderboard' | 'friends';
  id?: string;
  action?: 'join' | 'view' | 'edit';
  params?: Record<string, any>;
}

export interface DeepLinkConfig {
  scheme: string;
  host: string;
  pathPrefix: string;
}

class DeepLinkingService {
  private static instance: DeepLinkingService;
  private navigationRef: NavigationContainerRef<any> | null = null;
  private pendingLinks: DeepLinkData[] = [];
  private isInitialized: boolean = false;
  private config: DeepLinkConfig = {
    scheme: 'gamingtournament',
    host: 'app',
    pathPrefix: '/',
  };

  private constructor() {}

  static getInstance(): DeepLinkingService {
    if (!DeepLinkingService.instance) {
      DeepLinkingService.instance = new DeepLinkingService();
    }
    return DeepLinkingService.instance;
  }

  // Initialize the service with navigation reference
  initialize(navigationRef: NavigationContainerRef<any>): void {
    this.navigationRef = navigationRef;
    this.isInitialized = true;
    
    // Process any pending links
    this.processPendingLinks();
    
    // Set up deep link listeners
    this.setupDeepLinkListeners();
  }

  // Set up deep link listeners
  private setupDeepLinkListeners(): void {
    // Handle deep links when app is already running
    Linking.addEventListener('url', this.handleDeepLink);

    // Handle deep links when app is opened from a link
    Linking.getInitialURL().then(url => {
      if (url) {
        this.handleDeepLink({ url });
      }
    });
  }

  // Handle incoming deep links
  private handleDeepLink = (event: { url: string }): void => {
    const { url } = event;
    console.log('Deep link received:', url);

    try {
      const deepLinkData = this.parseDeepLink(url);
      if (deepLinkData) {
        this.navigateToDeepLink(deepLinkData);
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
      Alert.alert('Error', 'Invalid link format');
    }
  };

  // Parse deep link URL into structured data
  private parseDeepLink(url: string): DeepLinkData | null {
    try {
      const parsedUrl = new URL(url);
      
      // Check if it's our app's scheme
      if (parsedUrl.protocol !== `${this.config.scheme}:`) {
        return null;
      }

      const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
      
      if (pathSegments.length === 0) {
        return null;
      }

      const type = pathSegments[0] as DeepLinkData['type'];
      const id = pathSegments[1];
      const action = pathSegments[2] as DeepLinkData['action'];
      
      // Parse query parameters
      const params: Record<string, any> = {};
      parsedUrl.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      return {
        type,
        id,
        action,
        params,
      };
    } catch (error) {
      console.error('Error parsing deep link:', error);
      return null;
    }
  }

  // Navigate to the deep link destination
  private navigateToDeepLink(deepLinkData: DeepLinkData): void {
    if (!this.navigationRef || !this.isInitialized) {
      // Store for later processing
      this.pendingLinks.push(deepLinkData);
      return;
    }

    try {
      switch (deepLinkData.type) {
        case 'tournament':
          this.navigateToTournament(deepLinkData);
          break;
        case 'match':
          this.navigateToMatch(deepLinkData);
          break;
        case 'profile':
          this.navigateToProfile(deepLinkData);
          break;
        case 'wallet':
          this.navigateToWallet(deepLinkData);
          break;
        case 'leaderboard':
          this.navigateToLeaderboard(deepLinkData);
          break;
        case 'friends':
          this.navigateToFriends(deepLinkData);
          break;
        default:
          console.warn('Unknown deep link type:', deepLinkData.type);
      }
    } catch (error) {
      console.error('Error navigating to deep link:', error);
      Alert.alert('Navigation Error', 'Unable to navigate to the requested content');
    }
  }

  // Navigation methods for different content types
  private navigateToTournament(data: DeepLinkData): void {
    if (!this.navigationRef) return;

    if (data.id) {
      // Navigate to specific tournament
      this.navigationRef.navigate('Tournaments', {
        screen: 'TournamentDetails',
        params: {
          tournamentId: data.id,
          action: data.action || 'view',
          ...data.params,
        },
      });
    } else {
      // Navigate to tournaments list
      this.navigationRef.navigate('Tournaments');
    }
  }

  private navigateToMatch(data: DeepLinkData): void {
    if (!this.navigationRef) return;

    if (data.id) {
      // Navigate to specific match
      this.navigationRef.navigate('Matches', {
        screen: 'MatchDetails',
        params: {
          matchId: data.id,
          action: data.action || 'view',
          ...data.params,
        },
      });
    } else {
      // Navigate to matches list
      this.navigationRef.navigate('Matches');
    }
  }

  private navigateToProfile(data: DeepLinkData): void {
    if (!this.navigationRef) return;

    if (data.id) {
      // Navigate to specific user profile
      this.navigationRef.navigate('Profile', {
        userId: data.id,
        ...data.params,
      });
    } else {
      // Navigate to current user profile
      this.navigationRef.navigate('Profile');
    }
  }

  private navigateToWallet(data: DeepLinkData): void {
    if (!this.navigationRef) return;

    this.navigationRef.navigate('Wallet', {
      ...data.params,
    });
  }

  private navigateToLeaderboard(data: DeepLinkData): void {
    if (!this.navigationRef) return;

    this.navigationRef.navigate('Leaderboard', {
      ...data.params,
    });
  }

  private navigateToFriends(data: DeepLinkData): void {
    if (!this.navigationRef) return;

    this.navigationRef.navigate('Friends', {
      ...data.params,
    });
  }

  // Process any pending links that were received before initialization
  private processPendingLinks(): void {
    if (this.pendingLinks.length > 0) {
      console.log(`Processing ${this.pendingLinks.length} pending deep links`);
      this.pendingLinks.forEach(link => {
        this.navigateToDeepLink(link);
      });
      this.pendingLinks = [];
    }
  }

  // Generate deep links for sharing
  generateDeepLink(data: DeepLinkData): string {
    const { type, id, action, params } = data;
    let url = `${this.config.scheme}://${this.config.host}/${type}`;
    
    if (id) {
      url += `/${id}`;
    }
    
    if (action) {
      url += `/${action}`;
    }
    
    if (params && Object.keys(params).length > 0) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        queryParams.append(key, String(value));
      });
      url += `?${queryParams.toString()}`;
    }
    
    return url;
  }

  // Generate shareable links for different content types
  generateTournamentLink(tournamentId: string, action: 'view' | 'join' = 'view'): string {
    return this.generateDeepLink({
      type: 'tournament',
      id: tournamentId,
      action,
    });
  }

  generateMatchLink(matchId: string, action: 'view' | 'join' = 'view'): string {
    return this.generateDeepLink({
      type: 'match',
      id: matchId,
      action,
    });
  }

  generateProfileLink(userId: string): string {
    return this.generateDeepLink({
      type: 'profile',
      id: userId,
    });
  }

  // Share content via deep links
  async shareContent(data: DeepLinkData, title?: string, message?: string): Promise<void> {
    try {
      const deepLink = this.generateDeepLink(data);
      const shareMessage = message || 'Check out this content!';
      const shareTitle = title || 'Gaming Tournament';
      
      const shareUrl = `https://yourdomain.com/share?redirect=${encodeURIComponent(deepLink)}`;
      
      await Linking.share({
        title: shareTitle,
        message: `${shareMessage}\n\n${shareUrl}`,
        url: shareUrl,
      });
    } catch (error) {
      console.error('Error sharing content:', error);
      Alert.alert('Error', 'Unable to share content');
    }
  }

  // Check if deep linking is supported
  isSupported(): boolean {
    return Linking.canOpenURL(`${this.config.scheme}://${this.config.host}`);
  }

  // Open external URLs
  async openExternalUrl(url: string): Promise<void> {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    } catch (error) {
      console.error('Error opening external URL:', error);
      Alert.alert('Error', 'Unable to open URL');
    }
  }

  // Cleanup
  destroy(): void {
    if (this.isInitialized) {
      Linking.removeAllListeners('url');
      this.isInitialized = false;
      this.navigationRef = null;
    }
  }
}

export default DeepLinkingService.getInstance();
