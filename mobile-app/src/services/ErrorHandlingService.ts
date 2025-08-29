import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export interface ErrorLog {
  id: string;
  timestamp: number;
  error: string;
  stack?: string;
  context: string;
  userId?: string;
  deviceInfo: DeviceInfo;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

export interface DeviceInfo {
  platform: string;
  version: string;
  buildNumber: string;
  deviceId: string;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface ErrorConfig {
  enableLogging: boolean;
  enableCrashReporting: boolean;
  enableUserNotifications: boolean;
  maxLogEntries: number;
  retryConfig: RetryConfig;
}

class ErrorHandlingService {
  private static instance: ErrorHandlingService;
  private errorLogs: ErrorLog[] = [];
  private retryQueue: Map<string, { attempts: number; nextRetry: number; config: RetryConfig }> = new Map();
  private config: ErrorConfig = {
    enableLogging: true,
    enableCrashReporting: true,
    enableUserNotifications: true,
    maxLogEntries: 100,
    retryConfig: {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
    },
  };

  private constructor() {
    this.loadErrorLogs();
  }

  static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  // Error logging
  async logError(
    error: Error | string,
    context: string,
    severity: ErrorLog['severity'] = 'medium',
    userId?: string
  ): Promise<string> {
    try {
      const errorLog: ErrorLog = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        error: typeof error === 'string' ? error : error.message,
        stack: error instanceof Error ? error.stack : undefined,
        context,
        userId,
        deviceInfo: await this.getDeviceInfo(),
        severity,
        resolved: false,
      };

      this.errorLogs.push(errorLog);
      
      // Limit log entries
      if (this.errorLogs.length > this.config.maxLogEntries) {
        this.errorLogs = this.errorLogs.slice(-this.config.maxLogEntries);
      }

      await this.saveErrorLogs();
      
      // Show user notification for critical errors
      if (this.config.enableUserNotifications && severity === 'critical') {
        this.showUserNotification(errorLog);
      }

      // Send to crash reporting service if enabled
      if (this.config.enableCrashReporting) {
        await this.sendToCrashReporting(errorLog);
      }

      return errorLog.id;
    } catch (logError) {
      console.error('Error logging error:', logError);
      return '';
    }
  }

  // Get error logs
  async getErrorLogs(limit?: number): Promise<ErrorLog[]> {
    const logs = [...this.errorLogs].reverse(); // Most recent first
    return limit ? logs.slice(0, limit) : logs;
  }

  // Mark error as resolved
  async markErrorResolved(errorId: string): Promise<void> {
    const errorLog = this.errorLogs.find(log => log.id === errorId);
    if (errorLog) {
      errorLog.resolved = true;
      await this.saveErrorLogs();
    }
  }

  // Clear resolved errors
  async clearResolvedErrors(): Promise<void> {
    this.errorLogs = this.errorLogs.filter(log => !log.resolved);
    await this.saveErrorLogs();
  }

  // Clear all error logs
  async clearAllErrorLogs(): Promise<void> {
    this.errorLogs = [];
    await this.saveErrorLogs();
  }

  // Retry logic
  async retryOperation<T>(
    operation: () => Promise<T>,
    operationId: string,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.config.retryConfig, ...customConfig };
    
    try {
      return await operation();
    } catch (error) {
      const retryInfo = this.retryQueue.get(operationId) || {
        attempts: 0,
        nextRetry: Date.now(),
        config,
      };

      if (retryInfo.attempts >= config.maxAttempts) {
        // Max retries reached, log error and throw
        await this.logError(
          error instanceof Error ? error : new Error(String(error)),
          `Retry operation failed: ${operationId}`,
          'high'
        );
        throw error;
      }

      // Calculate next retry delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, retryInfo.attempts),
        config.maxDelay
      );

      retryInfo.attempts++;
      retryInfo.nextRetry = Date.now() + delay;
      this.retryQueue.set(operationId, retryInfo);

      // Schedule retry
      setTimeout(async () => {
        try {
          await this.retryOperation(operation, operationId, customConfig);
        } catch (retryError) {
          // This will be handled by the recursive call
        }
      }, delay);

      throw error; // Re-throw to indicate operation is pending
    }
  }

  // Cancel retry operation
  cancelRetry(operationId: string): void {
    this.retryQueue.delete(operationId);
  }

  // Get retry queue status
  getRetryQueueStatus(): Array<{ operationId: string; attempts: number; nextRetry: number }> {
    return Array.from(this.retryQueue.entries()).map(([operationId, info]) => ({
      operationId,
      attempts: info.attempts,
      nextRetry: info.nextRetry,
    }));
  }

  // Error recovery strategies
  async attemptRecovery(error: Error, context: string): Promise<boolean> {
    try {
      // Log the recovery attempt
      await this.logError(error, `Recovery attempt: ${context}`, 'medium');

      // Implement recovery strategies based on error type
      if (error.message.includes('network')) {
        return await this.attemptNetworkRecovery();
      } else if (error.message.includes('storage')) {
        return await this.attemptStorageRecovery();
      } else if (error.message.includes('authentication')) {
        return await this.attemptAuthRecovery();
      }

      return false;
    } catch (recoveryError) {
      await this.logError(
        recoveryError instanceof Error ? recoveryError : new Error(String(recoveryError)),
        'Recovery attempt failed',
        'high'
      );
      return false;
    }
  }

  private async attemptNetworkRecovery(): Promise<boolean> {
    // Implement network recovery logic
    // For now, return false to indicate no recovery possible
    return false;
  }

  private async attemptStorageRecovery(): Promise<boolean> {
    try {
      // Clear corrupted data and reinitialize
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      return false;
    }
  }

  private async attemptAuthRecovery(): Promise<boolean> {
    // Implement authentication recovery logic
    // For now, return false to indicate no recovery possible
    return false;
  }

  // User-friendly error messages
  getUserFriendlyMessage(error: Error | string): string {
    const errorMessage = typeof error === 'string' ? error : error.message;
    
    // Map technical errors to user-friendly messages
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'Network connection issue. Please check your internet connection and try again.';
    } else if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
      return 'Your session has expired. Please log in again.';
    } else if (errorMessage.includes('forbidden') || errorMessage.includes('403')) {
      return 'You don\'t have permission to perform this action.';
    } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      return 'The requested content could not be found.';
    } else if (errorMessage.includes('server') || errorMessage.includes('500')) {
      return 'Server error. Please try again later.';
    } else if (errorMessage.includes('timeout')) {
      return 'Request timed out. Please try again.';
    } else if (errorMessage.includes('storage') || errorMessage.includes('quota')) {
      return 'Storage issue. Please try clearing some space and try again.';
    } else {
      return 'An unexpected error occurred. Please try again.';
    }
  }

  // Show user notification
  private showUserNotification(errorLog: ErrorLog): void {
    if (this.config.enableUserNotifications) {
      Alert.alert(
        'Error Occurred',
        this.getUserFriendlyMessage(errorLog.error),
        [
          {
            text: 'Dismiss',
            style: 'cancel',
          },
          {
            text: 'Report',
            onPress: () => this.reportError(errorLog),
          },
        ]
      );
    }
  }

  // Report error to support
  private async reportError(errorLog: ErrorLog): Promise<void> {
    try {
      // This would integrate with your support system
      console.log('Reporting error to support:', errorLog);
      
      // For now, just show a confirmation
      Alert.alert(
        'Error Reported',
        'Thank you for reporting this error. Our team will investigate.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error reporting error:', error);
    }
  }

  // Send to crash reporting service
  private async sendToCrashReporting(errorLog: ErrorLog): Promise<void> {
    try {
      // This would integrate with services like Crashlytics, Sentry, etc.
      console.log('Sending to crash reporting service:', errorLog);
    } catch (error) {
      console.error('Error sending to crash reporting:', error);
    }
  }

  // Get device information
  private async getDeviceInfo(): Promise<DeviceInfo> {
    // This would get actual device info
    // For now, return mock data
    return {
      platform: 'react-native',
      version: '1.0.0',
      buildNumber: '1',
      deviceId: 'mock-device-id',
    };
  }

  // Persistence
  private async saveErrorLogs(): Promise<void> {
    try {
      await AsyncStorage.setItem('error_logs', JSON.stringify(this.errorLogs));
    } catch (error) {
      console.error('Error saving error logs:', error);
    }
  }

  private async loadErrorLogs(): Promise<void> {
    try {
      const logsData = await AsyncStorage.getItem('error_logs');
      if (logsData) {
        this.errorLogs = JSON.parse(logsData);
      }
    } catch (error) {
      console.error('Error loading error logs:', error);
    }
  }

  // Configuration
  updateConfig(newConfig: Partial<ErrorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): ErrorConfig {
    return { ...this.config };
  }

  // Cleanup
  destroy(): void {
    this.retryQueue.clear();
    this.errorLogs = [];
  }
}

export default ErrorHandlingService.getInstance();
