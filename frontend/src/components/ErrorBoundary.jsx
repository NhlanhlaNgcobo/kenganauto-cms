import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(_error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center"
                    style={{ background: '#0A0F1E', color: 'white' }}>

                    <div className="w-24 h-24 rounded-full flex items-center justify-center mb-8"
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <AlertTriangle size={40} className="text-red-400" />
                    </div>

                    <h1 className="font-outfit font-black text-3xl mb-4 text-white">
                        Something went wrong
                    </h1>

                    <p className="max-w-md text-sm leading-relaxed mb-8" style={{ color: 'rgba(240,237,232,0.62)' }}>
                        We encountered an unexpected error while trying to load this view. Please try refreshing the page. If the issue persists, contact support.
                    </p>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => window.location.reload()}
                            className="btn-gold py-3 px-6 rounded-xl flex items-center gap-2 font-bold"
                        >
                            <RefreshCw size={16} /> Reload Page
                        </button>
                        {/* Plain anchor: this boundary renders outside <Router>, so a router <Link> would crash the fallback itself */}
                        <a
                            href="/dashboard"
                            className="py-3 px-6 rounded-xl flex items-center gap-2 font-bold transition-all"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                            <Home size={16} /> Dashboard
                        </a>
                    </div>

                    {import.meta.env.DEV && this.state.error && (
                        <div className="mt-12 p-4 rounded-xl text-left bg-black/50 border border-white/10 w-full max-w-2xl overflow-auto text-xs font-mono text-red-300">
                            <p className="font-bold mb-2">{this.state.error.toString()}</p>
                            <pre>{this.state.errorInfo?.componentStack}</pre>
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
