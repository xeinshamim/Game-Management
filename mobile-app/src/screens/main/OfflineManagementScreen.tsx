import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Card, Button, Icon, Badge, Divider } from 'react-native-elements';
import { useOffline } from '../../hooks/useOffline';
import { useErrorHandling } from '../../hooks/useErrorHandling';
import OfflineStorageService from '../../services/OfflineStorageService';

const OfflineManagementScreen: React.FC = () => {
  const {
    isOnline,
    isOffline,
    connectionType,
    cacheStats,
    syncStats,
    cacheData,
    getCachedData,
    removeCachedData,
    clearAllCache,
    addToSyncQueue,
    triggerSync,
    formatBytes,
    getConnectionQuality,
  } = useOffline();

  const { handleOperation, logError } = useErrorHandling();
  const [refreshing, setRefreshing] = useState(false);
  const [testData, setTestData] = useState<any>(null);

  // Test cache functionality
  const testCacheOperations = async () => {
    try {
      // Test caching data
      const testData = {
        id: 'test-cache',
        message: 'This is test data for offline functionality',
        timestamp: new Date().toISOString(),
        data: { key: 'value', number: 42, array: [1, 2, 3] },
      };

      await cacheData('test-cache', testData, 5); // 5 minutes expiry
      Alert.alert('Success', 'Test data cached successfully!');

      // Retrieve cached data
      const retrieved = await getCachedData('test-cache');
      setTestData(retrieved);
    } catch (error) {
      await logError(error instanceof Error ? error : new Error(String(error)), 'Cache test operation');
    }
  };

  // Test sync queue
  const testSyncQueue = async () => {
    try {
      await addToSyncQueue({
        action: 'create',
        endpoint: '/api/test',
        data: { test: 'data', timestamp: Date.now() },
      });
      Alert.alert('Success', 'Test item added to sync queue!');
    } catch (error) {
      await logError(error instanceof Error ? error : new Error(String(error)), 'Sync queue test');
    }
  };

  // Clear specific cache
  const clearSpecificCache = async (key: string) => {
    try {
      await removeCachedData(key);
      Alert.alert('Success', `Cache '${key}' cleared successfully!`);
    } catch (error) {
      await logError(error instanceof Error ? error : new Error(String(error)), 'Clear specific cache');
    }
  };

  // Clear all cache with confirmation
  const clearAllCacheWithConfirmation = () => {
    Alert.alert(
      'Clear All Cache',
      'This will remove all cached data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllCache();
              Alert.alert('Success', 'All cache cleared successfully!');
            } catch (error) {
              await logError(error instanceof Error ? error : String(error), 'Clear all cache');
            }
          },
        },
      ]
    );
  };

  // Manual sync trigger
  const handleManualSync = async () => {
    try {
      await triggerSync();
      Alert.alert('Success', 'Manual sync triggered successfully!');
    } catch (error) {
      await logError(error instanceof Error ? error : new Error(String(error)), 'Manual sync');
    }
  };

  // Refresh data
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Simulate refresh delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      await logError(error instanceof Error ? error : new Error(String(error)), 'Refresh offline data');
    } finally {
      setRefreshing(false);
    }
  };

  // Get connection quality color
  const getConnectionQualityColor = () => {
    const quality = getConnectionQuality();
    switch (quality) {
      case 'excellent':
        return '#10b981';
      case 'good':
        return '#f59e0b';
      case 'poor':
        return '#ef4444';
      case 'offline':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Network Status */}
      <Card containerStyle={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Icon
            name={isOnline ? 'wifi' : 'wifi-off'}
            type="feather"
            size={24}
            color={isOnline ? '#10b981' : '#ef4444'}
          />
          <Text style={styles.statusTitle}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>

        <View style={styles.statusDetails}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Connection Type:</Text>
            <Text style={styles.statusValue}>{connectionType || 'Unknown'}</Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Quality:</Text>
            <View style={styles.qualityIndicator}>
              <View
                style={[
                  styles.qualityDot,
                  { backgroundColor: getConnectionQualityColor() },
                ]}
              />
              <Text style={styles.statusValue}>
                {getConnectionQuality().charAt(0).toUpperCase() + getConnectionQuality().slice(1)}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Cache Statistics */}
      <Card containerStyle={styles.statsCard}>
        <Text style={styles.cardTitle}>Cache Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Badge value={cacheStats.totalItems} status="primary" />
            <Text style={styles.statLabel}>Total Items</Text>
          </View>
          <View style={styles.statItem}>
            <Badge value={cacheStats.expiredItems} status="warning" />
            <Text style={styles.statLabel}>Expired</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatBytes(cacheStats.totalSize)}</Text>
            <Text style={styles.statLabel}>Total Size</Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.cacheActions}>
          <Button
            title="Test Cache"
            type="outline"
            buttonStyle={styles.actionButton}
            titleStyle={styles.actionButtonText}
            onPress={testCacheOperations}
            icon={{
              name: 'database',
              type: 'feather',
              size: 16,
              color: '#6366f1',
            }}
          />
          <Button
            title="Clear All"
            type="outline"
            buttonStyle={[styles.actionButton, styles.dangerButton]}
            titleStyle={[styles.actionButtonText, styles.dangerButtonText]}
            onPress={clearAllCacheWithConfirmation}
            icon={{
              name: 'trash-2',
              type: 'feather',
              size: 16,
              color: '#ef4444',
            }}
          />
        </View>
      </Card>

      {/* Sync Queue Status */}
      <Card containerStyle={styles.syncCard}>
        <Text style={styles.cardTitle}>Sync Queue Status</Text>
        <View style={styles.syncStats}>
          <View style={styles.syncStat}>
            <Badge value={syncStats.pendingItems} status="info" />
            <Text style={styles.syncLabel}>Pending Items</Text>
          </View>
          <View style={styles.syncStat}>
            <Badge value={syncStats.failedItems} status="error" />
            <Text style={styles.syncLabel}>Failed Items</Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.syncActions}>
          <Button
            title="Test Sync Queue"
            type="outline"
            buttonStyle={styles.actionButton}
            titleStyle={styles.actionButtonText}
            onPress={testSyncQueue}
            icon={{
              name: 'upload',
              type: 'feather',
              size: 16,
              color: '#6366f1',
            }}
          />
          <Button
            title="Manual Sync"
            type="outline"
            buttonStyle={styles.actionButton}
            titleStyle={styles.actionButtonText}
            onPress={handleManualSync}
            icon={{
              name: 'refresh-cw',
              type: 'feather',
              size: 16,
              color: '#6366f1',
            }}
          />
        </View>
      </Card>

      {/* Test Data Display */}
      {testData && (
        <Card containerStyle={styles.testDataCard}>
          <Text style={styles.cardTitle}>Test Cached Data</Text>
          <View style={styles.testDataContent}>
            <Text style={styles.testDataText}>
              <Text style={styles.testDataLabel}>Message:</Text> {testData.message}
            </Text>
            <Text style={styles.testDataText}>
              <Text style={styles.testDataLabel}>Timestamp:</Text> {testData.timestamp}
            </Text>
            <Text style={styles.testDataText}>
              <Text style={styles.testDataLabel}>Data:</Text> {JSON.stringify(testData.data)}
            </Text>
          </View>
          <Button
            title="Clear Test Data"
            type="outline"
            buttonStyle={[styles.actionButton, styles.dangerButton]}
            titleStyle={[styles.actionButtonText, styles.dangerButtonText]}
            onPress={() => clearSpecificCache('test-cache')}
            icon={{
              name: 'x',
              type: 'feather',
              size: 16,
              color: '#ef4444',
            }}
          />
        </Card>
      )}

      {/* Offline Features Info */}
      <Card containerStyle={styles.infoCard}>
        <Text style={styles.cardTitle}>Offline Features</Text>
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Icon name="check-circle" type="feather" size={16} color="#10b981" />
            <Text style={styles.featureText}>Automatic data caching</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="check-circle" type="feather" size={16} color="#10b981" />
            <Text style={styles.featureText}>Sync queue management</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="check-circle" type="feather" size={16} color="#10b981" />
            <Text style={styles.featureText}>Network status monitoring</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="check-circle" type="feather" size={16} color="#10b981" />
            <Text style={styles.featureText}>Automatic reconnection</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="check-circle" type="feather" size={16} color="#10b981" />
            <Text style={styles.featureText}>Cache expiration management</Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  statusCard: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 12,
  },
  statusDetails: {
    marginTop: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },
  qualityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statsCard: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
  },
  cacheActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    borderColor: '#6366f1',
    borderRadius: 8,
    minWidth: 120,
  },
  actionButtonText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
  },
  dangerButton: {
    borderColor: '#ef4444',
  },
  dangerButtonText: {
    color: '#ef4444',
  },
  syncCard: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
  },
  syncStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  syncStat: {
    alignItems: 'center',
  },
  syncLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  syncActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  testDataCard: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
  },
  testDataContent: {
    marginBottom: 16,
  },
  testDataText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
    lineHeight: 20,
  },
  testDataLabel: {
    fontWeight: '600',
    color: '#1e293b',
  },
  infoCard: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
  },
  featureList: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#475569',
    marginLeft: 12,
  },
});

export default OfflineManagementScreen;
