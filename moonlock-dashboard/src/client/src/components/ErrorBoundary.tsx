import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }

      // Default error UI
      return <DefaultErrorFallback error={this.state.error} retry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error;
  retry: () => void;
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, retry }) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400 text-2xl">⚠️</span>
          </div>
          
          <h2 className="text-xl font-semibold text-red-300 mb-2">
            Something went wrong
          </h2>
          
          <p className="text-red-400/80 text-sm mb-6">
            The Moonlock Dashboard encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
          </p>

          {isDevelopment && (
            <details className="mb-6 text-left">
              <summary className="text-red-300 text-sm cursor-pointer mb-2">
                Error Details (Development)
              </summary>
              <div className="bg-dark-800 rounded-lg p-3 text-xs text-red-200 font-mono">
                <div className="mb-2">
                  <strong>Error:</strong> {error.message}
                </div>
                <div>
                  <strong>Stack:</strong>
                  <pre className="whitespace-pre-wrap mt-1">
                    {error.stack}
                  </pre>
                </div>
              </div>
            </details>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={retry}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-dark-700 hover:bg-dark-600 text-dark-200 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-dark-500 text-xs">
            If this error persists, please report it at{' '}
            <a 
              href="https://github.com/anthropics/claude-code/issues" 
              className="text-moonlock-400 hover:text-moonlock-300 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Issues
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

// Specific error boundary for dashboard components
export const DashboardErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={DashboardErrorFallback}
      onError={(error, errorInfo) => {
        // Log to analytics or error reporting service
        console.error('Dashboard Error:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

const DashboardErrorFallback: React.FC<ErrorFallbackProps> = ({ error, retry }) => {
  return (
    <div className="metric-card">
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-400 text-lg">⚠️</span>
        </div>
        
        <h3 className="text-lg font-semibold text-red-300 mb-2">
          Component Error
        </h3>
        
        <p className="text-red-400/80 text-sm mb-4">
          This dashboard component encountered an error and needs to be reloaded.
        </p>

        <button
          onClick={retry}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
        >
          Retry Component
        </button>

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="text-red-300 text-xs cursor-pointer">
              Error Details
            </summary>
            <div className="bg-dark-800 rounded-lg p-2 mt-2 text-xs text-red-200 font-mono">
              {error.message}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};