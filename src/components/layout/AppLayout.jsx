import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export const AppLayout = ({ children }) => {
    const { isDarkMode } = useTheme();
    return (
        <div className={`${isDarkMode ? 'dark' : ''} h-screen flex transition-colors duration-300`}>
            {children}
        </div>
    );
};
