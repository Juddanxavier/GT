'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';

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
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
              <span className="text-red-400 text-xl font-bold">!</span>
            </div>
            <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
            <p className="text-sm text-zinc-400">
              {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
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
