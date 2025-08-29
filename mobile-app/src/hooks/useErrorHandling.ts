import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import ErrorHandlingService from '../services/ErrorHandlingService';
import { useAuth } from '../context/AuthContext';

export interface ErrorState {
  hasError: boolean;
  error: Error | null;
  isRetrying: boolean;
  retryCount: number;
}

export const useErrorHandling = () => {
  const { user } = useAuth();
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
    isRetrying: false,
    retryCount: 0,
  });

  // Log error with user context
  const logError = useCallback(async (
    error: Error | string,
    context: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<string> => {
    try {
      const errorId = await ErrorHandlingService.logError(
        error,
        context,
        severity,
        user?._id
      );
      
      setErrorState(prev => ({
        ...prev,
        hasError: true,
        error: error instanceof Error ? error : new Error(error),
      }));
      
      return errorId;
    } catch (logError) {
      console.error('Error logging error:', logError);
      return '';
    }
  }, [user?._id]);

  // Retry operation with exponential backoff
  const retryOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    operationId: string,
    maxAttempts: number = 3
  ): Promise<T> => {
    setErrorState(prev => ({ ...prev, isRetrying: true }));
    
    try {
      const result = await ErrorHandlingService.retryOperation(
        operation,
        operationId,
        { maxAttempts }
      );
      
      // Clear error state on success
      setErrorState({
        hasError: false,
        error: null,
        isRetrying: false,
        retryCount: 0,
      });
      
      return result;
    } catch (error) {
      setErrorState(prev => ({
        ...prev,
        isRetrying: false,
        retryCount: prev.retryCount + 1,
      }));
      
      throw error;
    }
  }, []);

  // Handle operation with automatic retry
  const handleOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    context: string,
    options: {
      enableRetry?: boolean;
      maxRetries?: number;
      showUserError?: boolean;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<T> => {
    const {
      enableRetry = true,
      maxRetries = 3,
      showUserError = true,
      onError,
    } = options;

    try {
      return await operation();
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      // Log the error
      await logError(errorObj, context, 'medium');
      
      // Call custom error handler
      if (onError) {
        onError(errorObj);
      }
      
      // Show user-friendly error message
      if (showUserError) {
        const userMessage = ErrorHandlingService.getUserFriendlyMessage(errorObj);
        Alert.alert('Error', userMessage, [
          { text: 'OK' },
          ...(enableRetry ? [{
            text: 'Retry',
            onPress: () => {
              if (enableRetry) {
                retryOperation(operation, `${context}_retry`, maxRetries);
              }
            },
          }] : []),
        ]);
      }
      
      throw errorObj;
    }
  }, [logError, retryOperation]);

  // Attempt error recovery
  const attemptRecovery = useCallback(async (error: Error, context: string): Promise<boolean> => {
    try {
      const recovered = await ErrorHandlingService.attemptRecovery(error, context);
      
      if (recovered) {
        setErrorState({
          hasError: false,
          error: null,
          isRetrying: false,
          retryCount: 0,
        });
      }
      
      return recovered;
    } catch (recoveryError) {
      console.error('Recovery attempt failed:', recoveryError);
      return false;
    }
  }, []);

  // Clear error state
  const clearError = useCallback((): void => {
    setErrorState({
      hasError: false,
      error: null,
      isRetrying: false,
      retryCount: 0,
    });
  }, []);

  // Get error logs
  const getErrorLogs = useCallback(async (limit?: number) => {
    try {
      return await ErrorHandlingService.getErrorLogs(limit);
    } catch (error) {
      console.error('Error getting error logs:', error);
      return [];
    }
  }, []);

  // Mark error as resolved
  const markErrorResolved = useCallback(async (errorId: string): Promise<void> => {
    try {
      await ErrorHandlingService.markErrorResolved(errorId);
    } catch (error) {
      console.error('Error marking error as resolved:', error);
    }
  }, []);

  // Get retry queue status
  const getRetryQueueStatus = useCallback(() => {
    return ErrorHandlingService.getRetryQueueStatus();
  }, []);

  // Cancel retry operation
  const cancelRetry = useCallback((operationId: string): void => {
    ErrorHandlingService.cancelRetry(operationId);
  }, []);

  // Update error handling configuration
  const updateErrorConfig = useCallback((newConfig: Partial<{
    enableLogging: boolean;
    enableCrashReporting: boolean;
    enableUserNotifications: boolean;
    maxLogEntries: number;
    maxRetryAttempts: number;
    baseRetryDelay: number;
    maxRetryDelay: number;
    backoffMultiplier: number;
  }>) => {
    const configUpdate: any = {};
    
    if (newConfig.maxRetryAttempts !== undefined) {
      configUpdate.retryConfig = { maxAttempts: newConfig.maxRetryAttempts };
    }
    if (newConfig.baseRetryDelay !== undefined) {
      configUpdate.retryConfig = { ...configUpdate.retryConfig, baseDelay: newConfig.baseRetryDelay };
    }
    if (newConfig.maxRetryDelay !== undefined) {
      configUpdate.retryConfig = { ...configUpdate.retryConfig, maxDelay: newConfig.maxRetryDelay };
    }
    if (newConfig.backoffMultiplier !== undefined) {
      configUpdate.retryConfig = { ...configUpdate.retryConfig, backoffMultiplier: newConfig.backoffMultiplier };
    }
    
    // Remove retryConfig from newConfig to avoid conflicts
    const { maxRetryAttempts, baseRetryDelay, maxRetryDelay, backoffMultiplier, ...otherConfig } = newConfig;
    
    ErrorHandlingService.updateConfig({
      ...otherConfig,
      ...configUpdate,
    });
  }, []);

  // Get current configuration
  const getErrorConfig = useCallback(() => {
    return ErrorHandlingService.getConfig();
  }, []);

  // Utility function to check if error is retryable
  const isRetryableError = useCallback((error: Error): boolean => {
    const errorMessage = error.message.toLowerCase();
    
    // Network-related errors are usually retryable
    if (errorMessage.includes('network') || 
        errorMessage.includes('fetch') || 
        errorMessage.includes('timeout') ||
        errorMessage.includes('connection')) {
      return true;
    }
    
    // Server errors (5xx) are usually retryable
    if (errorMessage.includes('500') || 
        errorMessage.includes('502') || 
        errorMessage.includes('503') ||
        errorMessage.includes('504')) {
      return true;
    }
    
    // Client errors (4xx) are usually not retryable
    if (errorMessage.includes('400') || 
        errorMessage.includes('401') || 
        errorMessage.includes('403') ||
        errorMessage.includes('404') ||
        errorMessage.includes('422')) {
      return false;
    }
    
    // Default to retryable for unknown errors
    return true;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup any pending retries
      const retryStatus = getRetryQueueStatus();
      retryStatus.forEach(({ operationId }) => {
        cancelRetry(operationId);
      });
    };
  }, [getRetryQueueStatus, cancelRetry]);

  return {
    // Error state
    ...errorState,
    
    // Core functions
    logError,
    retryOperation,
    handleOperation,
    attemptRecovery,
    clearError,
    
    // Error management
    getErrorLogs,
    markErrorResolved,
    getRetryQueueStatus,
    cancelRetry,
    
    // Configuration
    updateErrorConfig,
    getErrorConfig,
    
    // Utility functions
    isRetryableError,
  };
};
