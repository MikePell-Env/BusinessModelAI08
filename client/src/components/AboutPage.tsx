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

      {/* Main Content - Centered Text */}
      <main className="py-8 px-12 flex items-center justify-center" style={{ minHeight: 'calc(100vh - 80px)' }}>
        <div className="w-1/2 text-left space-y-6" style={{ marginTop: '-50px' }}>
          <div className="mb-4">
            <img 
              src="/images/envisioner-header.jpg" 
              alt="Envisioner Logo" 
              className="h-auto w-full"
            />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">ABOUT THE COMPANY</h2>
            <p className="text-gray-700 leading-relaxed">
              Envisioner, Inc. delivers breakthrough business simulation capabilities that will enable anyone to see, interactively explore, and quickly understand the highly dynamic and ever-changing nature of global business, enabling better decisions, faster.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">ABOUT THE SERVICE</h2>
            <p className="text-gray-700 leading-relaxed">
              The Envisioner is the world's first AI-powered assistant for Business Simulation. It leverages common Microsoft Office documents, web sites, and various data sources to provide an era of unparalleled insights and strategic decision-making, on any device, anywhere.
            </p>
          </div>

          <div className="mt-8">
            <p className="text-xl text-gray-900 font-medium italic">
              "AI is a Time Machine for business."
            </p>
          </div>
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