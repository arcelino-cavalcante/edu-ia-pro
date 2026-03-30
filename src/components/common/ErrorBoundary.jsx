import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { logClientError } from '../../services/errorService';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        logClientError(error, {
            componentStack: errorInfo?.componentStack || '',
            boundary: this.props.name || 'AppBoundary'
        });
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
                    <div className="max-w-lg w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-lg">
                        <div className="w-14 h-14 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center mb-5">
                            <AlertTriangle size={28} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Ocorreu um erro inesperado</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            A aplicação encontrou um problema, mas o erro já foi registrado para análise.
                        </p>
                        <button
                            onClick={this.handleReload}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                        >
                            <RefreshCcw size={16} />
                            Recarregar aplicação
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
