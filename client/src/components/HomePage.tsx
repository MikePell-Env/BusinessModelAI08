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

interface HomePageProps {
  onNavigateHome?: () => void;
  onNavigateExplore?: () => void;
  onNavigateOverview?: () => void;
  onNavigateAbout?: () => void;
  currentPage?: 'home' | 'explore' | 'overview' | 'about';
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigateHome, onNavigateExplore, onNavigateOverview, onNavigateAbout, currentPage }) => {
  const [showCanvas, setShowCanvas] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [loading, setLoading] = useState(false);
  const { loadCanvas, toggleChat } = useCanvas();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen for Envisioner activation events and file import triggers
  React.useEffect(() => {
    const handleOpenEnvisioner = (event: CustomEvent) => {
      console.log('📢 Received openEnvisioner event:', event.detail);
      setShowCanvas(true);
    };
    
    const handleTriggerFileImport = () => {
      console.log('📂 Received triggerFileImport event - opening file picker');
      handleDirectImport();
    };
    
    window.addEventListener('openEnvisioner', handleOpenEnvisioner as EventListener);
    window.addEventListener('triggerFileImport', handleTriggerFileImport as EventListener);
    
    return () => {
      window.removeEventListener('openEnvisioner', handleOpenEnvisioner as EventListener);
      window.removeEventListener('triggerFileImport', handleTriggerFileImport as EventListener);
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

  // Handle file selection and process immediately
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.includes('presentation') || file.name.endsWith('.pptx') || file.name.endsWith('.ppt')) {
        setLoading(true);
        
        try {
          console.log('🚀 Processing PowerPoint file immediately...');
          // Process the file immediately using the parser
          const canvas = await powerpointParser.parseFile(file);
          
          // Load the canvas with extracted data
          loadCanvas(canvas, true);
          console.log('✅ PowerPoint processed, overview data:', canvas.overviewData);
          
          // Navigate to Overview page with the extracted content
          onNavigateOverview?.();
        } catch (error) {
          console.error('PowerPoint processing error:', error);
          alert('Failed to process PowerPoint file. Please ensure it follows the Business Model Canvas format.');
        }
        
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
    onNavigateOverview?.(); // Go to Overview page after successful import
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-16 relative">
      <Header onNavigateHome={onNavigateHome} onNavigateExplore={onNavigateExplore} onNavigateOverview={onNavigateOverview} onNavigateAbout={onNavigateAbout} currentPage={currentPage} />

      {/* Main Content */}
      <main className="py-12 relative">
        <div className="flex justify-center px-8">
          <div className="w-full max-w-4xl">
            {/* Combined Dialog Box with Demo Banner Inside */}
            <div className="mb-8 mt-32">
              <div className="bg-white rounded-lg shadow-2xl border border-black">
                {/* Dark Grey Demo Banner - Now inside the dialog */}
                <div className="bg-gray-700 text-white p-4 rounded-t-lg">
                  <p className="text-base leading-tight">
                    <strong className="text-white">DEMO:</strong> <span className="text-gray-300">Let's illustrate the value of an</span> <strong className="text-gray-300">Envisioner</strong> <span className="text-gray-300">by helping you analyze a</span> <strong className="text-white">business model</strong> <span className="text-gray-300">in a very</span> <strong className="text-gray-300">new way</strong><span className="text-gray-300">, unlocking the ability to play what-if and ask the hard questions...</span>
                  </p>
                </div>
                
                {/* Dialog Content */}
                <div className="p-8">
                  <h2 className="text-xl text-gray-800 mb-6 text-center">
                    <strong>Select</strong> how you want to import your business model information:
                  </h2>

                  <div className="grid grid-cols-3 gap-6">
                    {/* Option 1 - Import Office Files */}
                    <div className="text-center">
                      <div className="bg-white p-6 rounded-lg border-2 border-black hover:shadow-md transition-shadow relative h-full flex flex-col shadow-2xl">
                        {/* Number 1 in top left */}
                        <div className="absolute top-4 left-4 bg-blue-500 text-white text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center">
                          1
                        </div>
                        
                        {/* Office Icons in center - flexible space */}
                        <div className="flex items-center justify-center space-x-2 flex-grow mt-8">
                          <img 
                            src="/powerpoint-icon.webp" 
                            alt="PowerPoint" 
                            className="w-16 h-16"
                          />
                          <img 
                            src="/excel-icon.webp" 
                            alt="Excel" 
                            className="w-16 h-16"
                          />
                        </div>
                        
                        {/* Button at bottom */}
                        <Button 
                          onClick={handleDirectImport}
                          disabled={loading}
                          className="w-full bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-600 border border-gray-400 rounded-lg py-2 mt-4 transition-colors"
                        >
                          {loading ? 'Processing...' : 'Import Office file...'}
                        </Button>
                      </div>
                    </div>

                    {/* Option 2 - Ask Copilot (Enabled) */}
                    <div className="text-center">
                      <div className="bg-white p-6 rounded-lg border-2 border-black hover:shadow-md transition-shadow relative h-full flex flex-col shadow-2xl">
                        {/* Number 2 in top left */}
                        <div className="absolute top-4 left-4 bg-blue-500 text-white text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center">
                          2
                        </div>
                        
                        {/* Copilot Icon in center - flexible space */}
                        <div className="flex items-center justify-center flex-grow mt-8">
                          <img 
                            src="/copilot-logo.png" 
                            alt="Microsoft Copilot" 
                            className="w-16 h-16"
                          />
                        </div>
                        
                        {/* Button at bottom */}
                        <Button 
                          onClick={toggleChat}
                          className="w-full bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-600 border border-gray-400 rounded-lg py-2 mt-4 transition-colors"
                        >
                          Ask Copilot...
                        </Button>
                      </div>
                    </div>

                    {/* Option 3 - Dev API (Disabled) */}
                    <div className="text-center opacity-50">
                      <div className="bg-white p-6 rounded-lg border-2 border-gray-400 relative h-full flex flex-col shadow-2xl">
                        {/* Number 3 in top left */}
                        <div className="absolute top-4 left-4 bg-gray-500 text-white text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center">
                          3
                        </div>
                        
                        {/* AI Foundry Icon in center - flexible space */}
                        <div className="flex items-center justify-center flex-grow mt-8">
                          <img 
                            src="/ai-foundry-icon.png" 
                            alt="AI Foundry" 
                            className="w-16 h-16"
                          />
                        </div>
                        
                        {/* Button at bottom */}
                        <Button 
                          disabled
                          className="w-full bg-gray-300 text-gray-900 hover:bg-gray-300 border border-gray-500 cursor-not-allowed rounded-lg py-2 mt-4"
                        >
                          Use MCP API
                        </Button>
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

      {/* Hidden file input for direct PowerPoint import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pptx,.ppt"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* PowerPoint Importer Modal */}
      {showImporter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Import PowerPoint File</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowImporter(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>
            <PowerPointImporter 
              onImportSuccess={handleImportSuccess}
              onCancel={() => setShowImporter(false)}
            />
          </div>
        </div>
      )}

      {/* AI Chat Component */}
      <AIChat />
    </div>
  );
};