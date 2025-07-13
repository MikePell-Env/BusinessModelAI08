import React from 'react';

interface MicrosoftCopilotIconProps {
  className?: string;
  size?: number;
}

export const MicrosoftCopilotIcon: React.FC<MicrosoftCopilotIconProps> = ({ 
  className = "", 
  size = 24 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Microsoft Copilot Logo - Simplified version */}
      <g transform="translate(2, 2)">
        {/* Main circular background */}
        <circle
          cx="10"
          cy="10"
          r="9"
          fill="currentColor"
          fillOpacity="0.1"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        
        {/* Copilot symbol - stylized "C" with pilot wing elements */}
        <path
          d="M6 7c0-2.2 1.8-4 4-4s4 1.8 4 4v2c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V7z"
          fill="currentColor"
          fillOpacity="0.2"
        />
        
        {/* Central "pilot" element */}
        <circle
          cx="10"
          cy="8"
          r="1.5"
          fill="currentColor"
        />
        
        {/* Wing-like elements */}
        <path
          d="M6 10l-2 1 2 1M14 10l2 1-2 1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Bottom indicator */}
        <path
          d="M8 14h4M9 16h2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export default MicrosoftCopilotIcon;