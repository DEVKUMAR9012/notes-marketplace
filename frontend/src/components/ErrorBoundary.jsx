import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="h-96 flex flex-col items-center justify-center gap-4 bg-white/5 border border-white/10 rounded-3xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400">
            <FiAlertTriangle size={28} />
          </div>
          <h3 className="text-xl font-bold text-white">Something went wrong</h3>
          <p className="text-gray-400 max-w-md text-center">
            {this.state.error?.message || "An unexpected error occurred in this module."}
          </p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl transition font-medium"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
