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
      <defs>
        {/* Main background gradient - blue to purple */}
        <linearGradient id="copilot-bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0078D4" />
          <stop offset="50%" stopColor="#6B46C1" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
        
        {/* Inner shape gradients */}
        <linearGradient id="shape1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE135" />
          <stop offset="100%" stopColor="#FFA500" />
        </linearGradient>
        
        <linearGradient id="shape2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D4AA" />
          <stop offset="100%" stopColor="#00A86B" />
        </linearGradient>
        
        <linearGradient id="shape3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B6B" />
          <stop offset="100%" stopColor="#EE5A24" />
        </linearGradient>
      </defs>
      
      {/* Main rounded square background */}
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="4"
        ry="4"
        fill="url(#copilot-bg)"
      />
      
      {/* Colorful geometric shapes inside */}
      <g transform="translate(6, 6)">
        {/* Yellow/Orange rounded rectangle */}
        <rect
          x="0"
          y="2"
          width="4"
          height="8"
          rx="2"
          fill="url(#shape1)"
          opacity="0.9"
        />
        
        {/* Green rounded triangle-like shape */}
        <path
          d="M5 1L11 4L8 10L5 7z"
          fill="url(#shape2)"
          opacity="0.9"
        />
        
        {/* Red/Pink curved shape */}
        <path
          d="M8 6L12 3L12 9L8 12z"
          fill="url(#shape3)"
          opacity="0.8"
        />
        
        {/* Small white accent */}
        <circle
          cx="3"
          cy="6"
          r="1"
          fill="#FFFFFF"
          opacity="0.8"
        />
      </g>
    </svg>
  );
};

export default MicrosoftCopilotIcon;