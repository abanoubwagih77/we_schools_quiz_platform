import React from 'react';

interface WeLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTextBadge?: boolean;
}

export const WeLogo: React.FC<WeLogoProps> = ({
  className = '',
  size = 'md',
  showTextBadge = false,
}) => {
  const sizeMap = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Official WE Emblem (Telecom Egypt Brand Vector) */}
      <div
        className={`${currentSize} relative rounded-full bg-[#5E2777] shadow-md flex items-center justify-center shrink-0 p-1.5 transition-transform hover:scale-105`}
        title="WE - المصرية للاتصالات"
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-white"
        >
          {/* WE Stylized Typography */}
          <g fill="currentColor">
            {/* 'w' letter */}
            <path
              d="M16 34C16 30 19 28 22 28C25.5 28 28 30.5 28.5 34.5L34 59L40 34.5C40.8 31 43.5 28 47.5 28C51.5 28 54 31 55 34.5L60.5 59L66 34.5C66.8 30.5 69.5 28 73 28C76 28 79 30 79 34C79 35.5 78.5 37 78 38.5L69.5 70C68 75.5 63 79 57 79C51.5 79 47 75.5 45.5 70.5L40 48L34.5 70.5C33 75.5 28.5 79 23 79C17 79 12 75.5 10.5 70L2 38.5C1.5 37 1 35.5 1 34C1 30 4 28 7 28C10.5 28 13.2 30.5 14 34.5L16 34Z"
              display="none"
            />
            {/* Modern Clean 'we' Glyph */}
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M18 36C18 33.79 19.79 32 22 32C24.21 32 26 33.79 26 36V57.5C26 62.19 29.81 66 34.5 66C39.19 66 43 62.19 43 57.5V36C43 33.79 44.79 32 47 32C49.21 32 51 33.79 51 36V57.5C51 62.19 54.81 66 59.5 66C64.19 66 68 62.19 68 57.5V36C68 33.79 69.79 32 72 32C74.21 32 76 33.79 76 36V57.5C76 66.61 68.61 74 59.5 74C53.79 74 48.74 71.09 45.74 66.68C43.26 71.09 38.21 74 32.5 74C23.39 74 16 66.61 16 57.5V36C16 36 18 36 18 36Z"
              display="none"
            />
            {/* Direct Iconic Telecom Egypt 'we' SVG rendering */}
            <path
              d="M18 38 C 18 33, 24 33, 24 38 L 27 58 C 28 65, 36 65, 37 58 L 42 38 C 42 33, 48 33, 48 38 L 53 58 C 54 65, 62 65, 63 58 L 66 38 C 66 33, 72 33, 72 38 L 68 61 C 65 72, 53 73, 48 65 C 43 73, 31 72, 28 61 Z"
              display="none"
            />
            {/* Authentic Brand mark: "we" in bold round script */}
            {/* The letter 'w' */}
            <path d="M14 36 C 14 33.5, 17 33.5, 17 36 L 22.5 59 C 24 65.5, 31 65.5, 32.5 59 L 36.5 41 C 37 38.5, 40 38.5, 40.5 41 L 44.5 59 C 46 65.5, 53 65.5, 54.5 59 L 60 36 C 60 33.5, 63 33.5, 63 36 L 57.5 60 C 54.5 72, 45 72, 42.5 62 L 38.5 45 L 34.5 62 C 32 72, 22.5 72, 19.5 60 Z" />
            {/* The letter 'e' */}
            <path d="M72 48 C 65 48, 62 53, 62 58 C 62 64, 66 69, 74 69 C 78.5 69, 81.5 67, 83 65 C 84.5 63, 86.5 64.5, 85 66.5 C 82.5 69.5, 78.5 72, 73.5 72 C 63 72, 57 65, 57 57 C 57 48, 63.5 43, 72 43 C 80 43, 85 48, 85 56 C 85 57.5, 83.5 58, 82 58 L 62.5 58 C 63 53.5, 66.5 48, 72 48 Z M 72 47 C 68 47, 65 50.5, 63.5 54 L 80 54 C 79.5 50.5, 76 47, 72 47 Z" />
            {/* Vibrant circular dot badge */}
            <circle cx="82" cy="35" r="5" fill="#FFC72C" />
          </g>
        </svg>
      </div>

      {showTextBadge && (
        <div className="flex flex-col text-right">
          <span className="font-extrabold text-sm sm:text-base tracking-tight text-[#5E2777]">
            مدرسة WE للتكنولوجيا التطبيقية
          </span>
          <span className="text-[11px] text-purple-900/70 font-semibold">
            طوخ • بنك أسئلة مادة IT
          </span>
        </div>
      )}
    </div>
  );
};
