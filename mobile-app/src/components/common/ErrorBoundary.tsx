import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Card, Button, Icon } from 'react-native-elements';
import ErrorHandlingService from '../../services/ErrorHandlingService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to our service
    ErrorHandlingService.logError(
      error,
      'React Error Boundary',
      'high'
    );

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  handleReportError = async (): Promise<void> => {
    if (this.state.error) {
      await ErrorHandlingService.logError(
        this.state.error,
        'User reported error from boundary',
        'critical'
      );
    }
  };

  toggleDetails = (): void => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails,
    }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <Card containerStyle={styles.errorCard}>
              <View style={styles.errorHeader}>
                <Icon
                  name="alert-circle"
                  type="feather"
                  size={48}
                  color="#ef4444"
                />
                <Text style={styles.errorTitle}>Something went wrong</Text>
                <Text style={styles.errorMessage}>
                  We're sorry, but something unexpected happened. Please try again or contact support if the problem persists.
                </Text>
              </View>

              <View style={styles.errorActions}>
                <Button
                  title="Try Again"
                  type="solid"
                  buttonStyle={styles.retryButton}
                  titleStyle={styles.retryButtonText}
                  onPress={this.handleRetry}
                  icon={{
                    name: 'refresh',
                    type: 'feather',
                    size: 16,
                    color: '#ffffff',
                  }}
                />

                <Button
                  title="Report Error"
                  type="outline"
                  buttonStyle={styles.reportButton}
                  titleStyle={styles.reportButtonText}
                  onPress={this.handleReportError}
                  icon={{
                    name: 'flag',
                    type: 'feather',
                    size: 16,
                    color: '#ef4444',
                  }}
                />

                <TouchableOpacity
                  style={styles.detailsButton}
                  onPress={this.toggleDetails}
                >
                  <Text style={styles.detailsButtonText}>
                    {this.state.showDetails ? 'Hide Details' : 'Show Details'}
                  </Text>
                  <Icon
                    name={this.state.showDetails ? 'chevron-up' : 'chevron-down'}
                    type="feather"
                    size={16}
                    color="#64748b"
                  />
                </TouchableOpacity>
              </View>

              {this.state.showDetails && this.state.error && (
                <View style={styles.errorDetails}>
                  <Text style={styles.detailsTitle}>Error Details</Text>
                  <Text style={styles.errorType}>
                    {this.state.error.name}: {this.state.error.message}
                  </Text>
                  
                  {this.state.errorInfo && (
                    <View style={styles.stackTrace}>
                      <Text style={styles.stackTitle}>Component Stack:</Text>
                      <Text style={styles.stackText}>
                        {this.state.errorInfo.componentStack}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </Card>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  errorCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  errorHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorActions: {
    width: '100%',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  reportButton: {
    borderColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  reportButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  detailsButtonText: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 8,
  },
  errorDetails: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 20,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  errorType: {
    fontSize: 14,
    color: '#ef4444',
    fontFamily: 'monospace',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  stackTrace: {
    marginTop: 16,
  },
  stackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  stackText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'monospace',
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
    lineHeight: 18,
  },
});

export default ErrorBoundary;
