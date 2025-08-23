import React from 'react';

interface HeaderProps {
  onNavigateHome?: () => void;
  onNavigateExplore?: () => void;
  currentPage?: 'home' | 'explore';
}

export const Header: React.FC<HeaderProps> = ({ onNavigateHome, onNavigateExplore, currentPage = 'home' }) => {
  return (
    <header className="bg-black text-white py-4 relative z-50">
      <div className="w-full flex justify-between items-center px-8">
        {/* Envisioner logo - left aligned with margin */}
        <div className="flex items-center">
          <img 
            src="/envisioner-logo-new.png" 
            alt="Envisioner" 
            className="h-5 w-auto cursor-pointer hover:opacity-80 transition-opacity"
            onClick={onNavigateHome}
          />
        </div>
        
        {/* Navigation menu - right aligned */}
        <nav className="flex items-center space-x-8">
          <button
            onClick={onNavigateHome}
            className={`hover:text-gray-300 transition-colors text-sm font-medium ${
              currentPage === 'home' ? 'text-blue-400' : 'text-white'
            }`}
          >
            Home
          </button>
          <a 
            href="#about" 
            className="text-white hover:text-gray-300 transition-colors text-sm font-medium"
          >
            About
          </a>
          <a 
            href="#contact" 
            className="text-white hover:text-gray-300 transition-colors text-sm font-medium"
          >
            Contact
          </a>
          <span className="text-gray-500 text-sm font-medium cursor-not-allowed">
            Excel
          </span>
          <span className="text-gray-500 text-sm font-medium cursor-not-allowed">
            PowerPoint
          </span>
        </nav>
      </div>
    </header>
  );
};