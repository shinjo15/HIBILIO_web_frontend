import { Component, type ReactNode } from 'react';
import { UnexpectedErrorFallback } from '../shared/pages/UnexpectedErrorFallback';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <UnexpectedErrorFallback />;
    }

    return this.props.children;
  }
}
