import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { BusinessModelCanvas } from './BusinessModelCanvas';
import { PowerPointImporter } from './PowerPointImporter';
import { AIChat } from './AIChat';
import { Header } from './Header';
import { useCanvas } from '@/lib/stores/useCanvas';
import sampleCanvasData from '@/data/sampleCanvas.json';
import { BusinessModelCanvas as CanvasType } from '@/types/canvas';
import { powerpointParser } from '@/utils/powerpointParser';

interface ExplorePageProps {
  onNavigateHome?: () => void;
  onNavigateExplore?: () => void;
  onNavigateOverview?: () => void;
  onNavigateAbout?: () => void;
  currentPage?: 'home' | 'explore' | 'overview' | 'about';
}

export const ExplorePage: React.FC<ExplorePageProps> = ({ onNavigateHome, onNavigateExplore, onNavigateOverview, onNavigateAbout, currentPage }) => {
  const [showCanvas, setShowCanvas] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [loading, setLoading] = useState(false);
  const { loadCanvas } = useCanvas();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen for Envisioner activation events
  React.useEffect(() => {
    const handleOpenEnvisioner = (event: CustomEvent) => {
      console.log('📢 Received openEnvisioner event:', event.detail);
      setShowCanvas(true);
    };
    
    window.addEventListener('openEnvisioner', handleOpenEnvisioner as EventListener);
    return () => {
      window.removeEventListener('openEnvisioner', handleOpenEnvisioner as EventListener);
    };
  }, []);

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

  // Handle direct file picker for PowerPoint import
  const handleDirectImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file selection and store file for processing in BusinessModelCanvas
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.includes('presentation') || file.name.endsWith('.pptx') || file.name.endsWith('.ppt')) {
        setLoading(true);
        
        // Store the file in the canvas store for BusinessModelCanvas to process
        const { setPendingPowerPointFile } = useCanvas.getState();
        setPendingPowerPointFile(file);
        
        // Go to 2D view - the BusinessModelCanvas will automatically process the file
        setShowCanvas(true);
        setLoading(false);
        
        // Reset file input for next use
        if (event.target) {
          event.target.value = '';
        }
      } else {
        alert('Please select a PowerPoint file (.pptx or .ppt)');
        // Reset file input
        if (event.target) {
          event.target.value = '';
        }
      }
    }
  };

  // Handle successful PowerPoint import (legacy for modal)
  const handleImportSuccess = (canvasData: CanvasType) => {
    loadCanvas(canvasData, true); // Set isFromPowerPoint flag to true
    setShowImporter(false);
    setShowCanvas(true); // Go to 2D view after successful import
  };

  return (
    <div className="min-h-screen bg-gray-200 relative">
      <Header onNavigateHome={onNavigateHome} onNavigateExplore={onNavigateExplore} onNavigateOverview={onNavigateOverview} onNavigateAbout={onNavigateAbout} currentPage={currentPage} />

      {/* Main Content */}
      <main className="bg-gray-200 min-h-screen py-12 relative">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex gap-8">
            {/* Left Column - Company Info */}
            <div className="flex-1">
              <div className="bg-white rounded-lg shadow-sm p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">
                  Company Name, Inc.
                </h1>
                
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    SUMMARY
                  </h2>
                  <div className="space-y-4 text-gray-700 leading-relaxed">
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
            </div>

            {/* Right Column - Analysis Tools */}
            <div className="w-80">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  EXPLORE
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Select any of these aspects of the organization's business model:
                </p>

                <div className="space-y-6">
                  {/* SWOT Analysis */}
                  <div className="text-center">
                    <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4 mb-3 h-24 flex items-center justify-center">
                      {/* Simple SWOT grid icon */}
                      <div className="grid grid-cols-2 gap-1 w-12 h-12">
                        <div className="bg-gray-400 rounded-sm"></div>
                        <div className="bg-gray-400 rounded-sm"></div>
                        <div className="bg-gray-400 rounded-sm"></div>
                        <div className="bg-gray-400 rounded-sm"></div>
                      </div>
                    </div>
                    <p className="font-medium text-gray-800">SWOT Analysis</p>
                  </div>

                  {/* Business Model Canvas */}
                  <div className="text-center">
                    <button
                      onClick={() => setShowCanvas(true)}
                      className="w-full bg-gray-50 border-2 border-gray-300 hover:border-blue-500 rounded-lg p-4 mb-3 h-24 flex items-center justify-center transition-colors"
                    >
                      {/* Simple canvas grid icon */}
                      <div className="w-12 h-8 border-2 border-gray-400 rounded relative">
                        <div className="absolute inset-1 grid grid-cols-3 gap-0.5">
                          <div className="bg-gray-300 rounded-sm"></div>
                          <div className="bg-gray-300 rounded-sm"></div>
                          <div className="bg-gray-300 rounded-sm"></div>
                        </div>
                      </div>
                    </button>
                    <p className="font-medium text-gray-800">Business Model Canvas</p>
                  </div>

                  {/* Financials */}
                  <div className="text-center">
                    <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4 mb-3 h-24 flex items-center justify-center">
                      {/* Simple bar chart icon */}
                      <div className="flex items-end space-x-1 h-8">
                        <div className="w-2 h-3 bg-gray-400 rounded-sm"></div>
                        <div className="w-2 h-5 bg-gray-400 rounded-sm"></div>
                        <div className="w-2 h-4 bg-gray-400 rounded-sm"></div>
                        <div className="w-2 h-6 bg-gray-400 rounded-sm"></div>
                        <div className="w-2 h-8 bg-gray-400 rounded-sm"></div>
                      </div>
                    </div>
                    <p className="font-medium text-gray-800">Financials</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer - Fixed to bottom */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gray-200 py-4 z-10">
        <div className="max-w-7xl mx-auto px-8 text-center text-gray-500 text-sm">
          Copyright © 2025 Envisioner, Inc. All Rights Reserved.
        </div>
      </footer>



      {/* AI Chat Component */}
      <AIChat />
    </div>
  );
};