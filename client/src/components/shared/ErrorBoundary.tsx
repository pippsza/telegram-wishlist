import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  fallback?: (err: Error, info: ErrorInfo | null) => ReactNode;
  // Tag printed in console.error to make it easier to attribute crashes.
  label?: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const tag = this.props.label ? `[${this.props.label}]` : '[ErrorBoundary]';
    console.error(tag, 'caught error', error);
    console.error(tag, 'component stack', info.componentStack);
    this.setState({ info });
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.state.info);
      return (
        <div className="m-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <div className="font-semibold text-destructive">Что-то сломалось</div>
          <div className="mt-2 break-all font-mono text-[11px] text-muted-foreground">
            {this.state.error.name}: {this.state.error.message}
          </div>
          {this.state.error.stack && (
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 font-mono text-[10px] text-muted-foreground">
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
