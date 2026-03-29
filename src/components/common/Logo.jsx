import React from 'react';

export const Logo = ({ className = "w-8 h-8", classNameText = "text-xl" }) => {
    return (
        <div className="flex items-center gap-2">
            <svg
                className={className}
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <rect width="40" height="40" rx="12" className="fill-indigo-600" />
                <path d="M20 12L28 16V24L20 28L12 24V16L20 12Z" className="stroke-white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="20" cy="20" r="3" className="fill-white" />
                <path d="M20 28V34" className="stroke-white/50" strokeWidth="2" strokeLinecap="round" />
                <path d="M12 24L8 27" className="stroke-white/50" strokeWidth="2" strokeLinecap="round" />
                <path d="M28 24L32 27" className="stroke-white/50" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {/* Logic to show text only if needed, or caller handles text. here we just provide the icon mostly */}
        </div>
    );
};

export const LogoFull = ({ className = "w-10 h-10", textSize = "text-2xl" }) => {
    return (
        <div className="flex items-center gap-3">
            <div className="relative">
                <div className={`absolute -inset-1 rounded-xl bg-indigo-500/30 blur-sm`}></div>
                <svg
                    className={`${className} relative relative z-10`}
                    viewBox="0 0 40 40"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <linearGradient id="logoGradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#6366f1" />
                            <stop offset="1" stopColor="#8b5cf6" />
                        </linearGradient>
                    </defs>
                    <rect width="40" height="40" rx="10" fill="url(#logoGradient)" />
                    {/* Abstract AI/Edu Shape: Hexagon (Data) + Central Dot (Core) + Lines (Connection) */}
                    <path d="M20 10L29 15.5V24.5L20 30L11 24.5V15.5L20 10Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" />
                    <circle cx="20" cy="20" r="4" fill="white" />
                    <path d="M20 4V10" stroke="white" strokeWidth="2" strokeOpacity="0.5" />
                    <path d="M33 33L29 24.5" stroke="white" strokeWidth="2" strokeOpacity="0.5" />
                    <path d="M7 33L11 24.5" stroke="white" strokeWidth="2" strokeOpacity="0.5" />
                </svg>
            </div>
            <div className="flex flex-col justify-center">
                <span className={`font-bold ${textSize} leading-none text-gray-900 dark:text-white tracking-tight`}>
                    DevARC Academy
                </span>
            </div>
        </div>
    );
};
