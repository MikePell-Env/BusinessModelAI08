import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class BabylonErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    console.error('Babylon.js Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center h-full bg-red-50 border border-red-200 rounded-lg p-8">
          <div className="text-red-600 text-xl font-semibold mb-4">
            3D Visualization Error
          </div>
          <div className="text-red-800 text-center mb-6 max-w-md">
            An error occurred while rendering the 3D business model canvas. 
            Please try refreshing the page or switching to 2D view.
          </div>
          
          {this.state.error && (
            <details className="bg-red-100 border border-red-300 rounded p-4 mb-4 max-w-lg">
              <summary className="cursor-pointer text-red-700 font-medium">
                Error Details
              </summary>
              <div className="mt-2 text-sm text-red-600 font-mono whitespace-pre-wrap">
                {this.state.error.message}
              </div>
            </details>
          )}
          
          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Refresh Page
            </button>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping Babylon components
export const withBabylonErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WrappedComponent = (props: P) => (
    <BabylonErrorBoundary
      onError={(error, errorInfo) => {
        // Send error to monitoring service if available
        console.error('Babylon component error:', { error, errorInfo });
      }}
    >
      <Component {...props} />
    </BabylonErrorBoundary>
  );

  WrappedComponent.displayName = `withBabylonErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};