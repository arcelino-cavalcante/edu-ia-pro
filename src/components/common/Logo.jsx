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

            <div className="flex flex-col justify-center">
                <span className={`font-bold ${textSize} leading-none text-gray-900 dark:text-white tracking-tight`}>
                    DevARC Academy
                </span>
            </div>
        </div>
    );
};
