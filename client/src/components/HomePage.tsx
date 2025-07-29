import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { BusinessModelCanvas } from './BusinessModelCanvas';
import { PowerPointImporter } from './PowerPointImporter';
import { AIChat } from './AIChat';
import { useCanvas } from '@/lib/stores/useCanvas';
import sampleCanvasData from '@/data/sampleCanvas.json';
import { BusinessModelCanvas as CanvasType } from '@/types/canvas';
import { powerpointParser } from '@/utils/powerpointParser';

export const HomePage: React.FC = () => {
  const [showCanvas, setShowCanvas] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [loading, setLoading] = useState(false);
  const { loadCanvas } = useCanvas();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // When canvas is shown, render the BusinessModelCanvas component
  if (showCanvas) {
    return <BusinessModelCanvas onNavigateHome={() => setShowCanvas(false)} />;
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
    <div className="min-h-screen bg-gray-100 pb-16 relative">
      {/* Header */}
      <header className="bg-black text-white px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Blue block - Envisioner logo always left aligned */}
          <div className="flex items-center space-x-3 justify-start">
            <img 
              src="/envisioner-logo.png" 
              alt="Envisioner" 
              className="h-8"
            />
          </div>
          
          {/* Yellow block - Menu items always right aligned */}
          <nav className="flex items-center space-x-8 justify-end">
            <a href="#" className="text-gray-300 hover:text-white transition-colors">About</a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Team</a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Contact</a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12 relative">
        <div className="flex">
          {/* Left Column - Main Content - Centered in available space, with right margin for fixed video column */}
          <div className="flex-1 px-8 flex justify-center" style={{ marginRight: '320px' }}>
            <div className="w-full max-w-4xl">
              <div className="text-center">
                <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                  Welcome to our working demo site!
                </h1>
                <p className="text-lg text-gray-600 mb-16">
                  (all real tech, no smoke and mirrors)
                </p>
              </div>

              {/* Demo Info Banner */}
              <div className="bg-blue-500 text-white p-6 rounded-lg mb-16">
                <p className="text-lg">
                  <strong>DEMO:</strong><br />
                  Let's illustrate the value of an <strong>Envisioner</strong> by helping you analyze a <strong>business model</strong> in a very <strong>new way</strong>, unlocking the ability to play what-if and ask the hard questions...
                </p>
              </div>

              {/* Selection Section */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">
                  <strong>Select</strong> how you want to get to the "moment of clarity" to make decisions:
                </h2>

              <div className="grid grid-cols-3 gap-6">
                {/* Option 1 - Import Office Files */}
                <div className="text-center">
                  <div className="bg-white p-6 rounded-lg shadow-md border border-blue-500 hover:border-blue-600 transition-colors relative h-full flex flex-col">
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
                      className="w-full bg-gray-200 text-gray-800 hover:bg-gray-300 border border-gray-400 rounded-lg py-2 mt-4"
                    >
                      {loading ? 'Processing...' : 'Import Office file...'}
                    </Button>
                  </div>
                </div>

                {/* Option 2 - Ask Copilot (Disabled) */}
                <div className="text-center opacity-50">
                  <div className="bg-white p-6 rounded-lg shadow-md border-2 border-gray-200 relative h-full flex flex-col">
                    {/* Number 2 in top left */}
                    <div className="absolute top-4 left-4 bg-gray-400 text-white text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center">
                      2
                    </div>
                    
                    {/* Copilot Icon in center - flexible space */}
                    <div className="flex items-center justify-center flex-grow mt-8">
                      <img 
                        src="/copilot-icon.webp" 
                        alt="Copilot" 
                        className="w-16 h-16"
                      />
                    </div>
                    
                    {/* Button at bottom */}
                    <Button 
                      disabled
                      className="w-full bg-gray-200 text-gray-800 hover:bg-gray-300 border border-gray-400 cursor-not-allowed rounded-lg py-2 mt-4"
                    >
                      Ask Copilot AI...
                    </Button>
                  </div>
                </div>

                {/* Option 3 - Dev API (Disabled) */}
                <div className="text-center opacity-50">
                  <div className="bg-white p-6 rounded-lg shadow-md border-2 border-gray-200 relative h-full flex flex-col">
                    {/* Number 3 in top left */}
                    <div className="absolute top-4 left-4 bg-gray-400 text-white text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center">
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
                      className="w-full bg-gray-200 text-gray-800 hover:bg-gray-300 border border-gray-400 cursor-not-allowed rounded-lg py-2 mt-4"
                    >
                      Dev? Use MCP API...
                    </Button>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>

          {/* Right Column - Videos with vertical line - Fixed to right edge */}
          <div className="fixed right-0 top-20 w-80 h-full">
            {/* Vertical gray line - aligned with bottom of Microsoft Copilot status box */}
            <div className="absolute left-0 top-0 w-px bg-gray-500" style={{ height: 'calc(100vh - 180px)' }}></div>
            
            {/* Content with left padding for spacing from line */}
            <div className="pl-8 pr-8">
              {/* Header text */}
              <div className="mb-8">
                <p className="text-lg text-gray-700 leading-relaxed">
                  Use Envisioners to bring these aspects of your business to life...
                </p>
              </div>
              
              {/* Video sections */}
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-full rounded-lg shadow-md mb-2 overflow-hidden">
                    <video 
                      className="w-full h-32 object-cover"
                      controls
                      muted
                      loop
                      autoPlay
                      onError={(e) => console.error('Video error:', e)}
                      onLoadStart={() => console.log('Video loading started')}
                      onCanPlay={() => console.log('Video can play')}
                    >
                      <source src="/neon-data-pathway.mp4" type="video/mp4" />
                      <source src="/2025-07-14T00-25-19_a_neon_data_pathway_1753819819664.mov" type="video/quicktime" />
                      <img 
                        src="/video-fallback.png" 
                        alt="Process Active" 
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </video>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Processes</p>
                </div>
                
                <div className="text-center">
                  <div className="w-full rounded-lg shadow-md mb-2 overflow-hidden">
                    <video 
                      className="w-full h-32 object-cover"
                      controls
                      muted
                      loop
                      autoPlay
                      onError={(e) => console.error('Data Analytics video error:', e)}
                      onLoadStart={() => console.log('Data Analytics video loading started')}
                      onCanPlay={() => console.log('Data Analytics video can play')}
                    >
                      <source src="/data-analytics-video.mp4" type="video/mp4" />
                      <img 
                        src="/video-fallback.png" 
                        alt="Data Analytics" 
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </video>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Datasets</p>
                </div>
                
                <div className="text-center">
                  <div className="w-full rounded-lg shadow-md mb-2 overflow-hidden">
                    <video 
                      className="w-full h-32 object-cover"
                      controls
                      muted
                      loop
                      autoPlay
                      onError={(e) => console.error('Systems video error:', e)}
                      onLoadStart={() => console.log('Systems video loading started')}
                      onCanPlay={() => console.log('Systems video can play')}
                    >
                      <source src="/systems-video.mp4" type="video/mp4" />
                      <img 
                        src="/video-fallback.png" 
                        alt="Systems Online" 
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </video>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Systems</p>
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