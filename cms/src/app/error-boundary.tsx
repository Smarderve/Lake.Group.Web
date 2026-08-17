import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from '../components/ui/ErrorState';
import { ErrorReference } from '../components/ui/ErrorReference';
import { buttonVariants } from '../components/ui/Button';
import { logError, makeErrorReference } from '../services/errors';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  reference: string | null;
}

/**
 * Top-level render error boundary. Catches anything that escapes the route
 * and page-level error states and shows a polished, sanitized screen: no
 * stack traces, source paths, component names or raw messages – just a calm
 * message, a retry, a way back to the dashboard, and a log-lookup reference.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, reference: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error, reference: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Diagnostics go to the developer log only – the UI never renders them.
    const reference = this.state.reference ?? makeErrorReference();
    this.setState({ reference });
    logError({
      reference,
      error,
      context: 'AppErrorBoundary',
    });
    // eslint-disable-next-line no-console -- component stack is dev diagnostic
    console.error('[CMS] component stack:', info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ error: null, reference: null });
  };

  render() {
    if (this.state.error) {
      // The boundary sits above RouterProvider, so a router-aware Link would
      // throw here – a plain anchor is the safe escape hatch to the dashboard.
      return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-canvas p-6">
          <ErrorState
            variant="server"
            title="Something went wrong"
            message="We couldn't load this part of the CMS. Please try again."
            onRetry={this.handleRetry}
            action={
              <a href="/app" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
                Go to Dashboard
              </a>
            }
          />
          {this.state.reference && <ErrorReference reference={this.state.reference} />}
        </div>
      );
    }
    return this.props.children;
  }
}
