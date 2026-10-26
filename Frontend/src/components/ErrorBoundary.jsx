import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Global React Error Boundary
 * Prevents unhandled render errors (in KaTeX, Monaco, or SVG parsers) from turning
 * the screen completely blank white. Provides instant recovery with preserved session notes.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Uncaught React render error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#fcfbf9] text-stone-800 flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-white rounded-2xl border border-stone-200 shadow-xl p-8 text-center space-y-5 animate-fadeIn">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="font-serif font-bold text-xl text-stone-900">Something went wrong</h2>
              <p className="text-sm text-stone-500 leading-relaxed">
                An unexpected interface error occurred. Don't worry — your whiteboard notes and study progress have been safely saved to IndexedDB.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600 font-mono text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-xl bg-stone-900 text-white hover:bg-stone-800 transition-colors shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload App</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
