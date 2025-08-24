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
      <main className="py-8 px-12" style={{ marginTop: '10vh' }}>
        <div className="max-w-7xl mx-auto">
          {/* Company Name */}
          <div className="mb-12">
            <h1 className="text-4xl font-normal text-gray-900">
              Company Name, Inc.
            </h1>
          </div>

          <div className="grid grid-cols-12 gap-8">
            {/* Left Column - Summary and Founders */}
            <div className="col-span-4 space-y-8">
              {/* Summary Section */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">SUMMARY</h2>
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
                  <p>
                    Explore any of these aspects of the business model. Explore any of these aspects of the 
                    business model. Explore any of these aspects of the business model. Explore any of 
                    these aspects of the business model.
                  </p>
                </div>
              </div>

              {/* Founders Section */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">FOUNDERS</h2>
                <div className="space-y-2 text-gray-700 text-sm">
                  <p>Founder information and details about the founding team would be displayed here.</p>
                </div>
              </div>
            </div>

            {/* Middle Column - Details */}
            <div className="col-span-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">DETAILS</h2>
                <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
                  <p>
                    Additional details about the organization and business model specifics would be 
                    presented in this section.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Explore Section */}
            <div className="col-span-4">
              <div className="flex">
                {/* Vertical Divider */}
                <div 
                  className="w-px mr-8 flex-shrink-0 bg-gray-300"
                  style={{ height: 'calc(100vh - 180px)' }}
                />
                
                {/* Explore Content */}
                <div className="flex-1">
                  {/* Explore Header */}
                  <div className="mb-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-2">EXPLORE</h2>
                    <p className="text-sm text-gray-600">
                      Select any of these aspects of the<br />
                      organization's business model:
                    </p>
                  </div>

                  {/* Explore Cards */}
                  <div className="space-y-4">
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