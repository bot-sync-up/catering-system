import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { FallbackUI } from './FallbackUI';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

/** גבול שגיאות עבור עץ React — תופס שגיאות בזמן רינדור ומציג fallback. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] תפסנו שגיאה:', error, info);
  }

  reset = (): void => this.setState({ error: null });

  override render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);
      return <FallbackUI error={this.state.error} onReset={this.reset} />;
    }
    return this.props.children;
  }
}
