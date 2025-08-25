import React from 'react';
import { Header } from './Header';

interface AboutPageProps {
  onNavigateHome?: () => void;
  onNavigateExplore?: () => void;
  onNavigateOverview?: () => void;
  onNavigateAbout?: () => void;
  currentPage?: 'home' | 'explore' | 'overview' | 'about';
}

export const AboutPage: React.FC<AboutPageProps> = ({ 
  onNavigateHome, 
  onNavigateExplore, 
  onNavigateOverview, 
  onNavigateAbout,
  currentPage 
}) => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header 
        onNavigateHome={onNavigateHome} 
        onNavigateExplore={onNavigateExplore}
        onNavigateOverview={onNavigateOverview}
        onNavigateAbout={onNavigateAbout}
        currentPage={currentPage} 
      />

      {/* Main Content - Centered Logo */}
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex items-center justify-center">
          <img 
            src="/Envisioner_logo_18.png" 
            alt="Envisioner" 
            className="max-w-full h-auto"
          />
        </div>
      </main>
    </div>
  );
};