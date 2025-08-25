import React from 'react';
import { Header } from './Header';
import { BusinessModelCanvas } from './BusinessModelCanvas';

interface OverviewPageProps {
  onNavigateHome?: () => void;
  onNavigateExplore?: () => void;
  onNavigateOverview?: () => void;
  onNavigateAbout?: () => void;
  currentPage?: 'home' | 'explore' | 'overview' | 'about';
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ 
  onNavigateHome, 
  onNavigateExplore, 
  onNavigateOverview,
  onNavigateAbout,
  currentPage 
}) => {
  const [isLoading, setIsLoading] = React.useState(false); // Start with content visible
  const [overviewData, setOverviewData] = React.useState<any>(null);
  const [showCanvas, setShowCanvas] = React.useState(false);

  const handleBusinessModelCanvasClick = async () => {
    try {
      // Load canvas store and switch to 3D Top view
      const { useCanvas } = await import('@/lib/stores/useCanvas');
      const { switchBMCView } = useCanvas.getState();
      
      // Switch to 3D Top view (view3DOrthographic)
      switchBMCView('view3DOrthographic');
      
      // Directly trigger the canvas to open without navigating to home page
      window.dispatchEvent(new CustomEvent('openEnvisioner', { 
        detail: { viewMode: 'view3DOrthographic' } 
      }));
    } catch (error) {
      console.error('Error switching to Business Model Canvas:', error);
      // Fallback: directly trigger canvas open
      window.dispatchEvent(new CustomEvent('openEnvisioner', { 
        detail: { viewMode: 'view3DOrthographic' } 
      }));
    }
  };

  React.useEffect(() => {
    // Load overview data immediately from canvas store
    const loadData = async () => {
      try {
        const { useCanvas } = await import('@/lib/stores/useCanvas');
        const canvas = useCanvas.getState().canvas;
        if (canvas?.overviewData) {
          // Fix founder title if it shows "founder" instead of "Chief Executive Officer"
          const fixedOverviewData = { ...canvas.overviewData };
          if (fixedOverviewData.founders && Array.isArray(fixedOverviewData.founders)) {
            fixedOverviewData.founders = fixedOverviewData.founders.map(founder => {
              if (typeof founder === 'string' && founder.includes('Mike Pell, founder')) {
                return founder.replace('Mike Pell, founder', 'Mike Pell, Chief Executive Officer');
              }
              return founder;
            });
          }
          setOverviewData(fixedOverviewData);
          
          // Also update the store with the fixed data
          useCanvas.getState().setOverviewData(fixedOverviewData);
          
          console.log('Overview data loaded and founder title fixed:', fixedOverviewData);
        }
      } catch (error) {
        console.log('No canvas data available yet');
      }
    };
    loadData();
  }, []);

  // Listen for Envisioner activation events
  React.useEffect(() => {
    const handleOpenEnvisioner = (event: CustomEvent) => {
      console.log('📢 OverviewPage received openEnvisioner event:', event.detail);
      setShowCanvas(true);
    };
    
    window.addEventListener('openEnvisioner', handleOpenEnvisioner as EventListener);
    
    return () => {
      window.removeEventListener('openEnvisioner', handleOpenEnvisioner as EventListener);
    };
  }, []);

  const getContent = (section: string[] | undefined, fallback: string[]) => {
    if (isLoading) {
      return [1, 2, 3].map((_, index) => (
        <div key={index} className="animate-pulse mb-4">
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      ));
    }
    
    return (section || fallback).map((paragraph, index) => (
      <p 
        key={index} 
        className="opacity-0 transition-all duration-500 ease-in-out"
        style={{ 
          animation: `fadeIn 0.5s ease-in forwards`,
          animationDelay: `${index * 200}ms` 
        }}
      >
        {paragraph}
      </p>
    ));
  };

  const defaultSummary = [
    'Business overview will be extracted from your PowerPoint presentation using Microsoft Copilot.',
    'Upload a presentation to see detailed company summary and market analysis.',
    'This section will provide AI-powered insights into your business model and opportunities.'
  ];

  const defaultFounders = [
    'Founder and leadership information will be analyzed and displayed here.',
    'Microsoft Copilot will extract details about the team background and experience.',
    'Upload your presentation to see AI-analyzed team member profiles and expertise.'
  ];

  const defaultMarket = [
    'Market analysis and target customer information will be extracted from your slides.',
    'This includes market size, customer segments, and competitive landscape insights.',
    'Upload your PowerPoint presentation to see detailed market opportunity analysis.'
  ];

  // When canvas is shown, render the BusinessModelCanvas component
  if (showCanvas) {
    return (
      <BusinessModelCanvas 
        onNavigateHome={() => setShowCanvas(false)}
        onNavigateExplore={onNavigateExplore}
        onNavigateOverview={onNavigateOverview}
        currentPage={currentPage}
      />
    );
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="min-h-screen bg-gray-100">
        <Header 
        onNavigateHome={onNavigateHome} 
        onNavigateExplore={onNavigateExplore}
        onNavigateOverview={onNavigateOverview}
        onNavigateAbout={onNavigateAbout}
        currentPage={currentPage} 
      />

      {/* Main Content */}
      <main className="py-8 px-12" style={{ marginTop: '5vh' }}>
        <div className="max-w-7xl mx-auto">
          {/* Company Name */}
          <div className="mb-12">
            <h1 className="text-4xl font-normal text-gray-900">
              {overviewData?.companyName || 'Company Name'}
            </h1>
          </div>

          <div className="grid grid-cols-12 gap-8">
            {/* Left Column - Summary and Founders */}
            <div className="col-span-4 space-y-8">
              {/* Summary Section */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">SUMMARY</h2>
                <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
                  {getContent(overviewData?.summary, defaultSummary)}
                </div>
              </div>

              {/* Founder Section */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">FOUNDER</h2>
                <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
                  {getContent(overviewData?.founders, defaultFounders)}
                </div>
              </div>
            </div>

            {/* Middle Column - Market and Website */}
            <div className="col-span-4 space-y-8">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">MARKET</h2>
                <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
                  {getContent(overviewData?.market, defaultMarket)}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">WEBSITE</h2>
                <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
                  {(overviewData?.website || ['Website information will be extracted from your PowerPoint presentation.']).map((item: string, index: number) => (
                    <p 
                      key={index} 
                      className="opacity-0 transition-all duration-500 ease-in-out"
                      style={{ 
                        animation: `fadeIn 0.5s ease-in forwards`,
                        animationDelay: `${index * 200}ms` 
                      }}
                    >
                      {typeof item === 'string' && item.startsWith('http') ? (
                        <a 
                          href={item} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline break-all"
                        >
                          {item}
                        </a>
                      ) : (
                        item
                      )}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Explore Section */}
            <div className="col-span-4">
              <div className="flex">
                {/* Vertical Divider */}
                <div 
                  className="w-px mr-8 flex-shrink-0 bg-gray-300"
                  style={{ height: 'calc(100vh - 400px)' }}
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
                  <div className="space-y-6">
                    {/* SWOT Analysis Card - Disabled */}
                    <div className="opacity-50 cursor-not-allowed">
                      <img 
                        src="/button_SWOT_wireframe_clean.png" 
                        alt="SWOT Analysis" 
                        className="w-full h-auto border border-black"
                      />
                      <div className="mt-3 mb-2">
                        <h3 className="text-center font-semibold text-gray-500 text-sm">SWOT Analysis</h3>
                      </div>
                    </div>

                    {/* Business Model Canvas Card */}
                    <div 
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                      onClick={handleBusinessModelCanvasClick}
                    >
                      <img 
                        src="/button_BMC_blueprint.png" 
                        alt="Business Model Canvas" 
                        className="w-full h-auto border-2 border-black shadow-xl hover:shadow-2xl transition-shadow"
                      />
                      <div className="mt-3 mb-2">
                        <h3 className="text-center font-semibold text-gray-900 text-sm">Business Model Canvas</h3>
                      </div>
                    </div>

                    {/* Financials Card */}
                    <div className="hover:opacity-80 transition-opacity cursor-pointer">
                      <img 
                        src="/button_Financials_wireframe.png" 
                        alt="Financials" 
                        className="w-full h-auto border-2 border-black shadow-xl hover:shadow-2xl transition-shadow"
                      />
                      <div className="mt-3 mb-2">
                        <h3 className="text-center font-semibold text-gray-900 text-sm">Financials</h3>
                      </div>
                    </div>

                    {/* What If Card - Disabled */}
                    <div className="opacity-50 cursor-not-allowed">
                      <img 
                        src="/button_WhatIf_wireframe_new.png" 
                        alt="What If?" 
                        className="w-full h-auto border border-black"
                      />
                      <div className="mt-3 mb-2">
                        <h3 className="text-center font-semibold text-gray-500 text-sm">What If?</h3>
                      </div>
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
    </>
  );
};