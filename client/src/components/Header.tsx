import React from 'react';

interface HeaderProps {
  onNavigateHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigateHome }) => {
  return (
    <header className="bg-black text-white py-4 relative z-50">
      <div className="w-full flex justify-between items-center px-8">
        {/* Envisioner logo - left aligned with margin */}
        <div className="flex items-center">
          <img 
            src="/envisioner-logo.png" 
            alt="Envisioner" 
            className="h-8 w-auto cursor-pointer hover:opacity-80 transition-opacity"
            onClick={onNavigateHome}
          />
        </div>
        
        {/* Navigation menu - right aligned */}
        <nav className="flex items-center space-x-8">
          <a 
            href="#about" 
            className="text-white hover:text-gray-300 transition-colors text-sm font-medium"
          >
            About
          </a>
          <a 
            href="#team" 
            className="text-white hover:text-gray-300 transition-colors text-sm font-medium"
          >
            Team
          </a>
          <a 
            href="#contact" 
            className="text-white hover:text-gray-300 transition-colors text-sm font-medium"
          >
            Contact
          </a>
        </nav>
      </div>
    </header>
  );
};