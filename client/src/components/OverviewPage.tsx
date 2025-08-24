import React from 'react';
import { Header } from './Header';

interface OverviewPageProps {
  onNavigateHome?: () => void;
  onNavigateExplore?: () => void;
  onNavigateOverview?: () => void;
  currentPage?: 'home' | 'explore' | 'overview';
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ 
  onNavigateHome, 
  onNavigateExplore, 
  onNavigateOverview,
  currentPage 
}) => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header 
        onNavigateHome={onNavigateHome} 
        onNavigateExplore={onNavigateExplore}
        onNavigateOverview={onNavigateOverview}
        currentPage={currentPage} 
      />

      {/* Main Content */}
      <main className="py-8 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-12 gap-8 h-full">
            
            {/* Left Column - Summary */}
            <div className="col-span-8 space-y-6">
              {/* Summary Section */}
              <div className="bg-white rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">SUMMARY</h2>
                <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
                  <p>
                    Explore any of these aspects of the business model. Explore any of these aspects of the 
                    business model. Explore any of these aspects of the business model. Explore any of 
                    these aspects of the business model.
                  </p>
                  <p>
                    Explore any of these aspects of the business model. Explore any of these aspects of the 
                    business model. Explore any of these aspects of the business model. Explore any of 
                    these aspects of the business model.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Company Name and Explore Section */}
            <div className="col-span-4 space-y-6">
              {/* Company Name */}
              <div className="flex items-start justify-center pt-16">
                <h1 className="text-4xl font-normal text-gray-900 text-center">
                  Company Name, Inc.
                </h1>
              </div>

              {/* Horizontal Divider */}
              <div className="flex justify-end">
                <div className="w-3/4 border-t border-gray-400"></div>
              </div>
              {/* Explore Header */}
              <div className="flex justify-end">
                <div className="text-right w-3/4">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">EXPLORE</h2>
                  <p className="text-sm text-gray-600">
                    Select any of these aspects of the<br />
                    organization's business model:
                  </p>
                </div>
              </div>

              {/* Explore Cards */}
              <div className="flex justify-end">
                <div className="space-y-4 w-3/4">
                {/* SWOT Analysis Card */}
                <div className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-16 h-16 border-2 border-gray-400 rounded flex items-center justify-center">
                      {/* SWOT Grid Icon */}
                      <div className="grid grid-cols-2 gap-1 w-8 h-8">
                        <div className="bg-gray-400 rounded-sm"></div>
                        <div className="bg-gray-400 rounded-sm"></div>
                        <div className="bg-gray-400 rounded-sm"></div>
                        <div className="bg-gray-400 rounded-sm"></div>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-center font-semibold text-gray-900">SWOT Analysis</h3>
                </div>

                {/* Business Model Canvas Card */}
                <div className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-16 h-16 border-2 border-gray-400 rounded flex items-center justify-center">
                      {/* Canvas Icon */}
                      <div className="relative w-10 h-10">
                        <div className="absolute inset-0 border-2 border-gray-400 rounded"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 border border-gray-400 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-center font-semibold text-gray-900">Business Model Canvas</h3>
                </div>

                {/* Financials Card */}
                <div className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-16 h-16 border-2 border-gray-400 rounded flex items-center justify-center">
                      {/* Bar Chart Icon */}
                      <div className="flex items-end space-x-1 h-8">
                        <div className="w-2 h-4 bg-gray-400 rounded-sm"></div>
                        <div className="w-2 h-6 bg-gray-400 rounded-sm"></div>
                        <div className="w-2 h-3 bg-gray-400 rounded-sm"></div>
                        <div className="w-2 h-7 bg-gray-400 rounded-sm"></div>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-center font-semibold text-gray-900">Financials</h3>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-8 text-center text-gray-500 text-sm">
          Copyright © 2025 Envisioner, Inc. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
};