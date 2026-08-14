import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from '../components/ui/ErrorState';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Top-level render error boundary. Every screen gets its own recovery path
 * via ErrorState; this catches anything that escapes them.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Local console only – a backend security-log wire-up is part of a later phase.
    console.error('[CMS] render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[100dvh] items-center justify-center p-6">
          <ErrorState
            title="Something went wrong"
            message="An unexpected error interrupted this screen. Your work is safe – reload to continue."
            onRetry={() => this.setState({ error: null })}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
