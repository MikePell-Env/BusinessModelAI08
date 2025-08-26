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
      <main className="py-8 px-12 flex items-center justify-center" style={{ minHeight: 'calc(100vh - 80px)' }}>
        <div className="flex items-center justify-center">
          <img 
            src="/attached_assets/Envisioner_logo_21_1756231938437.png" 
            alt="Envisioner Logo" 
            className="max-w-full h-auto"
            style={{ maxHeight: '400px' }}
          />
        </div>
      </main>

      {/* Footer - Fixed to bottom */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-4 z-10">
        <div className="max-w-7xl mx-auto px-8 text-center text-gray-500 text-sm">
          Copyright © 2025 Envisioner, Inc. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
};