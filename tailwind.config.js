/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors')

export default {
    content: [
        "./index.html",
        "./index.jsx",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                indigo: {
                    50: '#f3f4f6',
                    100: '#e5e7eb',
                    200: '#d1d5db',
                    300: '#a0a0a0',
                    400: '#ffffff',
                    500: '#1a1a1a',
                    600: '#0a0a0a',
                    700: '#000000',
                    800: '#000000',
                    900: '#000000',
                    950: '#000000',
                },
                blue: {
                    50: '#f3f4f6',
                    100: '#e5e7eb',
                    200: '#d1d5db',
                    300: '#a0a0a0',
                    400: '#ffffff',
                    500: '#1a1a1a',
                    600: '#0a0a0a',
                    700: '#000000',
                    800: '#000000',
                    900: '#000000',
                    950: '#000000',
                },
                gray: {
                    50: '#fafafa',
                    100: '#f5f5f5',
                    200: '#e5e5e5',
                    300: '#d4d4d4',
                    400: '#a0a0a0',
                    500: '#737373',
                    600: '#525252',
                    700: '#262626',
                    800: '#1a1a1a',
                    850: '#121212',
                    900: '#0a0a0a',
                    950: '#000000',
                }
            }
        },
    },
    darkMode: 'class',
    plugins: [],
}
