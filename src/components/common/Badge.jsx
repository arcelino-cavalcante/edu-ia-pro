import React from 'react';

export const Badge = ({ children, color = 'indigo' }) => {
    const colors = {
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-white/10 dark:text-indigo-300 dark:border-indigo-800',
        green: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
        gray: 'bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
        yellow: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
        red: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[color] || colors.gray}`}>
            {children}
        </span>
    );
};
