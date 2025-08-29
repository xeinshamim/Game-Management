import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import OfflineStorageService from '../services/OfflineStorageService';

export interface OfflineStatus {
  isOnline: boolean;
  isOffline: boolean;
  connectionType: string | null;
  isConnected: boolean | null;
}

export interface CacheStats {
  totalItems: number;
  totalSize: number;
  expiredItems: number;
}

export interface SyncStats {
  pendingItems: number;
  failedItems: number;
}

export const useOffline = () => {
  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>({
    isOnline: true,
    isOffline: false,
    connectionType: null,
    isConnected: null,
  });
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    totalItems: 0,
    totalSize: 0,
    expiredItems: 0,
  });
  const [syncStats, setSyncStats] = useState<SyncStats>({
    pendingItems: 0,
    failedItems: 0,
  });

  // Update network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const newStatus: OfflineStatus = {
        isOnline: state.isConnected ?? false,
        isOffline: !(state.isConnected ?? false),
        connectionType: state.type,
        isConnected: state.isConnected,
      };
      setOfflineStatus(newStatus);
    });

    return () => unsubscribe();
  }, []);

  // Update cache and sync stats periodically
  useEffect(() => {
    const updateStats = async () => {
      try {
        const [newCacheStats, newSyncStats] = await Promise.all([
          OfflineStorageService.getCacheStats(),
          OfflineStorageService.getSyncQueueStats(),
        ]);
        setCacheStats(newCacheStats);
        setSyncStats(newSyncStats);
      } catch (error) {
        console.error('Error updating offline stats:', error);
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Cache management functions
  const cacheData = useCallback(async <T>(key: string, data: T, customExpiry?: number) => {
    try {
      await OfflineStorageService.cacheData(key, data, customExpiry);
      // Update stats after caching
      const newStats = await OfflineStorageService.getCacheStats();
      setCacheStats(newStats);
    } catch (error) {
      console.error('Error caching data:', error);
      throw error;
    }
  }, []);

  const getCachedData = useCallback(async <T>(key: string): Promise<T | null> => {
    try {
      return await OfflineStorageService.getCachedData<T>(key);
    } catch (error) {
      console.error('Error retrieving cached data:', error);
      return null;
    }
  }, []);

  const removeCachedData = useCallback(async (key: string) => {
    try {
      await OfflineStorageService.removeCachedData(key);
      // Update stats after removal
      const newStats = await OfflineStorageService.getCacheStats();
      setCacheStats(newStats);
    } catch (error) {
      console.error('Error removing cached data:', error);
      throw error;
    }
  }, []);

  const clearAllCache = useCallback(async () => {
    try {
      await OfflineStorageService.clearAllCache();
      setCacheStats({ totalItems: 0, totalSize: 0, expiredItems: 0 });
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }, []);

  // Sync queue management
  const addToSyncQueue = useCallback(async (item: {
    action: 'create' | 'update' | 'delete';
    endpoint: string;
    data: any;
  }) => {
    try {
      await OfflineStorageService.addToSyncQueue(item);
      // Update sync stats after adding to queue
      const newStats = await OfflineStorageService.getSyncQueueStats();
      setSyncStats(newStats);
    } catch (error) {
      console.error('Error adding to sync queue:', error);
      throw error;
    }
  }, []);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    try {
      // This would trigger the sync process manually
      // For now, we'll just update the stats
      const newStats = await OfflineStorageService.getSyncQueueStats();
      setSyncStats(newStats);
    } catch (error) {
      console.error('Error triggering sync:', error);
      throw error;
    }
  }, []);

  // Network status helpers
  const checkNetworkStatus = useCallback(async () => {
    try {
      const state = await NetInfo.fetch();
      const newStatus: OfflineStatus = {
        isOnline: state.isConnected ?? false,
        isOffline: !(state.isConnected ?? false),
        connectionType: state.type,
        isConnected: state.isConnected,
      };
      setOfflineStatus(newStatus);
      return newStatus;
    } catch (error) {
      console.error('Error checking network status:', error);
      return offlineStatus;
    }
  }, [offlineStatus]);

  // Utility functions
  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const getConnectionQuality = useCallback((): 'excellent' | 'good' | 'poor' | 'offline' => {
    if (offlineStatus.isOffline) return 'offline';
    
    switch (offlineStatus.connectionType) {
      case 'wifi':
        return 'excellent';
      case 'cellular':
        return 'good';
      default:
        return 'poor';
    }
  }, [offlineStatus]);

  return {
    // Network status
    ...offlineStatus,
    
    // Cache management
    cacheData,
    getCachedData,
    removeCachedData,
    clearAllCache,
    cacheStats,
    
    // Sync management
    addToSyncQueue,
    triggerSync,
    syncStats,
    
    // Utility functions
    checkNetworkStatus,
    formatBytes,
    getConnectionQuality,
  };
};
