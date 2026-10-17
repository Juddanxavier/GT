'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import * as Sentry from '@sentry/nextjs';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-14 h-14 mx-auto rounded-full bg-danger/10 flex items-center justify-center">
              <span className="text-danger-soft-foreground text-xl font-bold">!</span>
            </div>
            <h1 className="text-lg font-semibold text-foreground tracking-tight">Something went wrong</h1>
            <p className="text-sm text-muted">
              {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
            </p>
            <button
              type="button"
              onClick={() => { this.setState({ hasError: false, error: null }); }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-surface text-foreground text-sm hover:bg-surface-secondary transition-colors border border-border"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
