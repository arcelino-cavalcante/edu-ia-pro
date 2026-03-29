import React, { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

const icons = {
    success: <CheckCircle size={20} className="text-emerald-500" />,
    error: <AlertCircle size={20} className="text-red-500" />,
    warning: <AlertTriangle size={20} className="text-amber-500" />,
    info: <Info size={20} className="text-indigo-500" />
};

const styles = {
    success: "border-emerald-500/20 bg-emerald-500/5",
    error: "border-red-500/20 bg-red-500/5",
    warning: "border-amber-500/20 bg-amber-500/5",
    info: "border-indigo-500/20 bg-indigo-500/5"
};

export const Toast = ({ id, type = 'info', message, onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id);
        }, duration);
        return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    return (
        <div className={`flex items-center gap-3 p-4 rounded-xl border backdrop-blur-md shadow-xl animate-in fade-in slide-in-from-right-8 duration-300 max-w-sm w-full bg-gray-900/90 ${styles[type]}`}>
            <div className="shrink-0">{icons[type]}</div>
            <p className="text-sm font-medium text-gray-200 flex-1">{message}</p>
            <button onClick={() => onClose(id)} className="text-gray-500 hover:text-white transition-colors">
                <X size={16} />
            </button>
        </div>
    );
};
