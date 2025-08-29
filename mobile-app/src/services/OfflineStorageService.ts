import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version: string;
}

export interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  endpoint: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

export interface OfflineConfig {
  cacheExpiryMinutes: number;
  maxCacheSize: number;
  maxRetryAttempts: number;
  syncIntervalMs: number;
}

class OfflineStorageService {
  private static instance: OfflineStorageService;
  private isOnline: boolean = true;
  private syncQueue: SyncQueueItem[] = [];
  private syncInterval: NodeJS.Timeout | null = null;
  private config: OfflineConfig = {
    cacheExpiryMinutes: 60, // 1 hour
    maxCacheSize: 50, // Max 50 cached items
    maxRetryAttempts: 3,
    syncIntervalMs: 30000, // 30 seconds
  };

  private constructor() {
    this.initializeNetworkListener();
    this.loadSyncQueue();
    this.startSyncProcess();
  }

  static getInstance(): OfflineStorageService {
    if (!OfflineStorageService.instance) {
      OfflineStorageService.instance = new OfflineStorageService();
    }
    return OfflineStorageService.instance;
  }

  // Network status monitoring
  private initializeNetworkListener(): void {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (wasOffline && this.isOnline) {
        console.log('Network restored, starting sync process');
        this.processSyncQueue();
      } else if (!this.isOnline) {
        console.log('Network lost, switching to offline mode');
      }
    });
  }

  // Cache management
  async cacheData<T>(key: string, data: T, customExpiry?: number): Promise<void> {
    try {
      const expiresAt = Date.now() + (customExpiry || this.config.cacheExpiryMinutes) * 60 * 1000;
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiresAt,
        version: '1.0',
      };

      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
      await this.cleanupExpiredCache();
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(`cache_${key}`);
      if (!cached) return null;

      const cacheItem: CacheItem<T> = JSON.parse(cached);
      
      // Check if cache is expired
      if (Date.now() > cacheItem.expiresAt) {
        await this.removeCachedData(key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.error('Error retrieving cached data:', error);
      return null;
    }
  }

  async removeCachedData(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.error('Error removing cached data:', error);
    }
  }

  async clearAllCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
      console.log('All cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  private async cleanupExpiredCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      // Remove expired items
      for (const key of cacheKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const cacheItem: CacheItem<any> = JSON.parse(cached);
          if (Date.now() > cacheItem.expiresAt) {
            await AsyncStorage.removeItem(key);
          }
        }
      }

      // Limit cache size if needed
      if (cacheKeys.length > this.config.maxCacheSize) {
        const sortedKeys = await this.getSortedCacheKeys();
        const keysToRemove = sortedKeys.slice(0, cacheKeys.length - this.config.maxCacheSize);
        await AsyncStorage.multiRemove(keysToRemove);
      }
    } catch (error) {
      console.error('Error cleaning up cache:', error);
    }
  }

  private async getSortedCacheKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      const keyTimestamps: { key: string; timestamp: number }[] = [];

      for (const key of cacheKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const cacheItem: CacheItem<any> = JSON.parse(cached);
          keyTimestamps.push({ key, timestamp: cacheItem.timestamp });
        }
      }

      return keyTimestamps
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(item => item.key);
    } catch (error) {
      console.error('Error sorting cache keys:', error);
      return [];
    }
  }

  // Sync queue management
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const syncItem: SyncQueueItem = {
        ...item,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0,
      };

      this.syncQueue.push(syncItem);
      await this.saveSyncQueue();
      console.log('Added to sync queue:', syncItem);
    } catch (error) {
      console.error('Error adding to sync queue:', error);
    }
  }

  private async loadSyncQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem('sync_queue');
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Error loading sync queue:', error);
    }
  }

  private async saveSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  // Sync process
  private startSyncProcess(): void {
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.processSyncQueue();
      }
    }, this.config.syncIntervalMs);
  }

  private async processSyncQueue(): Promise<void> {
    if (this.syncQueue.length === 0 || !this.isOnline) return;

    console.log(`Processing sync queue with ${this.syncQueue.length} items`);
    const itemsToProcess = [...this.syncQueue];

    for (const item of itemsToProcess) {
      try {
        await this.processSyncItem(item);
        // Remove successful item from queue
        this.syncQueue = this.syncQueue.filter(qItem => qItem.id !== item.id);
      } catch (error) {
        console.error('Error processing sync item:', error);
        item.retryCount++;
        
        if (item.retryCount >= this.config.maxRetryAttempts) {
          // Remove failed item after max retries
          this.syncQueue = this.syncQueue.filter(qItem => qItem.id !== item.id);
          console.log('Removed failed sync item after max retries:', item);
        }
      }
    }

    await this.saveSyncQueue();
  }

  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    // This would integrate with your API service
    // For now, we'll simulate the process
    console.log('Processing sync item:', item);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate success/failure
    if (Math.random() > 0.1) { // 90% success rate
      console.log('Sync item processed successfully:', item);
    } else {
      throw new Error('Simulated API failure');
    }
  }

  // Offline status
  isOffline(): boolean {
    return !this.isOnline;
  }

  getNetworkStatus(): boolean {
    return this.isOnline;
  }

  // Utility methods
  async getCacheStats(): Promise<{ totalItems: number; totalSize: number; expiredItems: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      let expiredCount = 0;
      let totalSize = 0;

      for (const key of cacheKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          totalSize += cached.length;
          const cacheItem: CacheItem<any> = JSON.parse(cached);
          if (Date.now() > cacheItem.expiresAt) {
            expiredCount++;
          }
        }
      }

      return {
        totalItems: cacheKeys.length,
        totalSize,
        expiredItems: expiredCount,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { totalItems: 0, totalSize: 0, expiredItems: 0 };
    }
  }

  async getSyncQueueStats(): Promise<{ pendingItems: number; failedItems: number }> {
    const failedItems = this.syncQueue.filter(item => item.retryCount > 0).length;
    return {
      pendingItems: this.syncQueue.length,
      failedItems,
    };
  }

  // Cleanup
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

export default OfflineStorageService.getInstance();
