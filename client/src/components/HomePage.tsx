import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BusinessModelCanvas } from './BusinessModelCanvas';
import { PowerPointImporter } from './PowerPointImporter';
import { useCanvas } from '@/lib/stores/useCanvas';
import sampleCanvasData from '@/data/sampleCanvas.json';
import { BusinessModelCanvas as CanvasType } from '@/types/canvas';

export const HomePage: React.FC = () => {
  const [showCanvas, setShowCanvas] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const { loadCanvas } = useCanvas();

  // When canvas is shown, render the BusinessModelCanvas component
  if (showCanvas) {
    return <BusinessModelCanvas />;
  }

  // Handle successful PowerPoint import
  const handleImportSuccess = (canvasData: CanvasType) => {
    loadCanvas(canvasData);
    setShowImporter(false);
    setShowCanvas(true); // Go to 2D view after successful import
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gray-900 text-white px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="text-2xl font-bold">⚡ ENVISIONER</div>
          </div>
          
          <nav className="flex items-center space-x-8">
            <a href="#" className="text-gray-300 hover:text-white transition-colors">About</a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Team</a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Contact</a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="col-span-2">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Welcome to our working demo site! (all real tech, no smoke and mirrors)
            </h1>

            {/* Demo Info Banner */}
            <div className="bg-blue-500 text-white p-6 rounded-lg mb-8">
              <p className="text-lg">
                <strong>DEMO:</strong> Let's illustrate the value of an <strong>Envisioner</strong> by helping you analyze a <strong>business model</strong> in a very <strong>new way</strong>, unlocking the ability to play what-if and ask the hard questions...
              </p>
            </div>

            {/* Selection Section */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                <strong>Select</strong> how you want to get to the "moment of clarity" to make decisions:
              </h2>

              <div className="grid grid-cols-3 gap-6">
                {/* Option 1 - Import Office Files */}
                <div className="text-center">
                  <div className="bg-white p-6 rounded-lg shadow-md border-2 border-gray-200 hover:border-blue-500 transition-colors">
                    <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <div className="flex space-x-1">
                        {/* PowerPoint Icon */}
                        <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center text-white text-xs font-bold">
                          P
                        </div>
                        {/* Excel Icon */}
                        <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center text-white text-xs font-bold">
                          X
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-200 text-gray-600 text-2xl font-bold w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                      1
                    </div>
                    <Button 
                      onClick={() => setShowImporter(true)}
                      className="w-full bg-gray-200 text-gray-800 hover:bg-gray-300 border border-gray-400"
                    >
                      Import Office file...
                    </Button>
                  </div>
                </div>

                {/* Option 2 - Ask Copilot (Disabled) */}
                <div className="text-center opacity-50">
                  <div className="bg-white p-6 rounded-lg shadow-md border-2 border-gray-200">
                    <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                    </div>
                    <div className="bg-gray-200 text-gray-600 text-2xl font-bold w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                      2
                    </div>
                    <Button 
                      disabled
                      className="w-full bg-gray-100 text-gray-500 cursor-not-allowed"
                    >
                      Ask Copilot...
                    </Button>
                  </div>
                </div>

                {/* Option 3 - Dev API (Disabled) */}
                <div className="text-center opacity-50">
                  <div className="bg-white p-6 rounded-lg shadow-md border-2 border-gray-200">
                    <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                    </div>
                    <div className="bg-gray-200 text-gray-600 text-2xl font-bold w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                      3
                    </div>
                    <Button 
                      disabled
                      className="w-full bg-gray-100 text-gray-500 cursor-not-allowed"
                    >
                      Dev? Use MCP API...
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Images */}
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-full h-32 bg-gradient-to-br from-blue-900 to-blue-700 rounded-lg shadow-md mb-2 flex items-center justify-center">
                <div className="text-green-400 text-sm font-mono">
                  &lt;Process&gt; Active
                </div>
              </div>
              <p className="text-sm text-gray-600 font-medium">Processes</p>
            </div>
            
            <div className="text-center">
              <div className="w-full h-32 bg-gradient-to-br from-orange-600 to-yellow-500 rounded-lg shadow-md mb-2 flex items-center justify-center">
                <div className="text-white text-sm font-bold">
                  📊 Data Analytics
                </div>
              </div>
              <p className="text-sm text-gray-600 font-medium">Datasets</p>
            </div>
            
            <div className="text-center">
              <div className="w-full h-32 bg-gradient-to-br from-gray-800 to-gray-600 rounded-lg shadow-md mb-2 flex items-center justify-center">
                <div className="text-blue-400 text-sm font-mono">
                  [System] Online
                </div>
              </div>
              <p className="text-sm text-gray-600 font-medium">Systems</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 mt-20">
        <div className="max-w-7xl mx-auto px-8 text-center text-gray-500 text-sm">
          Copyright © 2025 Envisioner, Inc. All Rights Reserved.
        </div>
      </footer>

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
    </div>
  );
};