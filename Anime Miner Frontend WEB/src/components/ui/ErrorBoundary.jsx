import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center glass-panel rounded-2xl border border-accent/30 my-6 mx-auto max-w-lg shadow-2xl">
          <div className="p-4 bg-accent/10 text-accent rounded-full mb-4 animate-pulse">
            <AlertTriangle size={36} />
          </div>
          <h2 className="text-xl font-display font-bold text-white mb-2">
            {this.props.title || "Something went wrong"}
          </h2>
          <p className="text-sm text-zinc-400 mb-6 max-w-sm">
            {this.state.error?.message || "An unexpected error occurred while rendering this component."}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-accent/20 cursor-pointer border-none"
            >
              <RefreshCw size={16} /> Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-xl font-bold text-sm transition-all border border-white/10 cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
