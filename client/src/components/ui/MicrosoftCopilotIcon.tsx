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
      {/* Microsoft Copilot Logo - Simplified hexagonal segments */}
      <g transform="translate(4, 4)">
        {/* Create 6 segments forming a flower-like pattern */}
        
        {/* Top segment - Blue */}
        <path
          d="M8 2L10 4L8 6L6 4z"
          fill="#0078D4"
        />
        
        {/* Top-right segment - Cyan */}
        <path
          d="M10 4L12 6L10 8L8 6z"
          fill="#00BCF2"
        />
        
        {/* Bottom-right segment - Green */}
        <path
          d="M10 8L12 10L10 12L8 10z"
          fill="#00CC6A"
        />
        
        {/* Bottom segment - Orange */}
        <path
          d="M8 10L10 12L8 14L6 12z"
          fill="#FF8C00"
        />
        
        {/* Bottom-left segment - Purple */}
        <path
          d="M6 8L8 10L6 12L4 10z"
          fill="#8661C5"
        />
        
        {/* Top-left segment - Red */}
        <path
          d="M6 4L8 6L6 8L4 6z"
          fill="#E74856"
        />
        
        {/* Central white circle */}
        <circle
          cx="8"
          cy="8"
          r="2"
          fill="#FFFFFF"
          stroke="#E5E5E5"
          strokeWidth="0.5"
        />
      </g>
    </svg>
  );
};

export default MicrosoftCopilotIcon;