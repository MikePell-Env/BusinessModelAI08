import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCanvas } from '@/lib/stores/useCanvas';
import { useEnvisionerType } from '@/lib/stores/useEnvisionerType';
import { Canvas2D } from './Canvas2D';
import { Canvas3DBabylon } from './Canvas3DBabylon';
import { AIChat } from './AIChat';
import { Header } from './Header';
import { MicrosoftStackStatus } from './MicrosoftStackStatus';
import { PowerPointImporter } from './PowerPointImporter';
import { MicrosoftRecommendations } from './MicrosoftRecommendations';
import sampleCanvasData from '@/data/sampleCanvas.json';
import samplePowerPointData from '@/data/samplePowerPointCanvas.json';
import { BusinessModelCanvas as CanvasType } from '@/types/canvas';
import { Eye, Box, RotateCcw, RectangleHorizontal, Settings, Home } from 'lucide-react';
import { powerpointParser } from '@/utils/powerpointParser';

interface BusinessModelCanvasProps {
  onNavigateHome?: () => void;
  onNavigateExplore?: () => void;
  onNavigateOverview?: () => void;
  onNavigateAbout?: () => void;
  currentPage?: 'home' | 'explore' | 'overview' | 'about';
}

export const BusinessModelCanvas: React.FC<BusinessModelCanvasProps> = ({ 
  onNavigateHome, 
  onNavigateExplore, 
  onNavigateOverview, 
  onNavigateAbout,
  currentPage = 'home' 
}) => {
  // Canvas state
  const {
    canvas,
    is3D,
    isOrthographic,
    isTransitioning,
    error,
    loadCanvas,
    toggleView,
    setOrthographicView,
    setError,
    pendingPowerPointFile,
    setPendingPowerPointFile
  } = useCanvas();
  
  // Envisioner type state  
  const { currentTemplate, currentType, switchToBusinessModel, switchToFinancials } = useEnvisionerType();
  
  console.log(`🟡 BusinessModelCanvas render: is3D=${is3D}, isOrthographic=${isOrthographic}, isTransitioning=${isTransitioning}`);
  console.log(`🟡 Current Envisioner Type: ${currentType}, Template: ${currentTemplate.name}`);
  console.log(`🟡 Template sections count: ${currentTemplate.sections.length}`);
  console.log(`🟡 Will render: ${is3D ? 'Canvas3DBabylon' : 'Canvas2D'}`);
  


  useEffect(() => {
    // Check if there's a pending PowerPoint file to process
    if (pendingPowerPointFile) {
      
      // Execute the same logic as the PowerPointImporter component
      const processPowerPointFile = async () => {
        try {
          // This is exactly what PowerPointImporter does when clicked
          const canvas = await powerpointParser.parseFile(pendingPowerPointFile);
          loadCanvas(canvas, true); // Same as PowerPointImporter
          setPendingPowerPointFile(null); // Clear the pending file
        } catch (error) {
          console.error('PowerPoint processing error:', error);
          alert('Failed to process PowerPoint file. Please ensure it follows the Business Model Canvas format.');
          setPendingPowerPointFile(null); // Clear the pending file even on error
          
          // Load sample canvas as fallback
          loadCanvas(sampleCanvasData as CanvasType);
        }
      };
      
      processPowerPointFile();
    } else if (!canvas) {
      // Only load sample canvas data if no canvas is loaded yet AND no PowerPoint file is pending
      try {
        loadCanvas(sampleCanvasData as CanvasType);
      } catch (err) {
        console.error('Error loading canvas data:', err);
        setError('Failed to load canvas data');
      }
    }
  }, [loadCanvas, setError, pendingPowerPointFile, setPendingPowerPointFile, canvas]);

  const handleToggleView = () => {
    toggleView();
  };

  const handleReset = () => {
    try {
      loadCanvas(sampleCanvasData as CanvasType);
      setError(null);
    } catch (err) {
      console.error('Error resetting canvas:', err);
      setError('Failed to reset canvas');
    }
  };

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-800 mb-2">Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={handleReset} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!canvas) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading business model canvas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-white relative">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header 
          onNavigateHome={onNavigateHome} 
          onNavigateExplore={onNavigateExplore}
          onNavigateOverview={onNavigateOverview}
          onNavigateAbout={onNavigateAbout}
          currentPage={currentPage}
        />
      </div>

      {/* Fixed View Controls - positioned below header */}
      <div className="fixed top-14 left-4 z-40 flex space-x-2" style={{ marginTop: '10px' }}>
        {/* 2D View button - hidden but functionality preserved */}
        <Button
          onClick={handleToggleView}
          disabled={isTransitioning}
          className={`hidden border border-gray-300 shadow-md ${
            !is3D ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white text-gray-800 hover:bg-gray-50'
          }`}
          size="sm"
        >
          <Eye className="w-4 h-4 mr-2" />
          2D View
        </Button>

        {/* 3D Top button - hidden but functionality preserved */}
        <Button
          onClick={(e) => {
            console.log(`🟡 3D TOP BUTTON CLICKED!`);
            console.log(`🟡 Event:`, e);
            console.log(`🟡 isTransitioning: ${isTransitioning}`);
            console.log(`🟡 Button disabled: ${isTransitioning}`);
            console.log(`🟡 setOrthographicView exists: ${typeof setOrthographicView}`);
            
            if (!isTransitioning) {
              console.log(`🟡 Calling setOrthographicView(true)...`);
              setOrthographicView(true);
              console.log(`🟡 setOrthographicView(true) completed`);
            } else {
              console.log(`🟡 Button disabled due to isTransitioning=true`);
            }
          }}
          disabled={isTransitioning}
          className={`hidden border border-gray-300 shadow-md ${
            isOrthographic ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white text-gray-800 hover:bg-gray-50'
          }`}
          size="sm"
        >
          <RectangleHorizontal className="w-4 h-4 mr-2" />
          3D Top
        </Button>

        {/* Envisioner Type Buttons */}
        <Button
          onClick={switchToBusinessModel}
          disabled={isTransitioning}
          className={`border border-gray-300 shadow-md ${
            currentType === 'business-model' ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white text-gray-800 hover:bg-gray-50'
          }`}
          size="sm"
        >
          <Box className="w-4 h-4 mr-2" />
          Business Model
        </Button>

        <Button
          onClick={switchToFinancials}
          disabled={isTransitioning}
          className={`border border-gray-300 shadow-md ${
            currentType === 'financials' ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white text-gray-800 hover:bg-gray-50'
          }`}
          size="sm"
        >
          <Settings className="w-4 h-4 mr-2" />
          Financials
        </Button>

      </div>
      
      {/* Main content with minimal padding */}
      <div className="pt-12 h-full relative">

      {/* Reset Button & Microsoft Stack Status */}
      <div className="absolute top-4 right-4 z-40 flex space-x-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="bg-white border-gray-300 hover:bg-gray-50 shadow-md"
            >
              <Settings className="w-4 h-4 mr-2" />
              Microsoft Stack
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gray-100">
            <DialogHeader>
              <DialogTitle>Microsoft Technology Stack Migration</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-lg font-semibold mb-3">Technology Stack Status</h3>
                <MicrosoftStackStatus />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3">Business Recommendations</h3>
                <MicrosoftRecommendations canvas={canvas} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        <Button
          onClick={handleReset}
          variant="outline"
          size="sm"
          className="bg-white border-gray-300 hover:bg-gray-50 shadow-md"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>

      {/* Canvas Views */}
      <div className="w-full h-full relative">
        {is3D ? (
          <Canvas3DBabylon canvas={canvas} isTransitioning={isTransitioning} template={currentTemplate} />
        ) : (
          <Canvas2D canvas={canvas} isTransitioning={isTransitioning} />
        )}
      </div>

      {/* AI Chat Component */}
      <AIChat />

      {/* PowerPoint Import Button - Bottom Center (only in 2D view) */}
      {!is3D && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-40">
          <PowerPointImporter />
        </div>
      )}

      {/* Fixed Copyright Bar - Bottom (only in 3D views) */}
      {is3D && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 z-50">
          <div className="max-w-7xl mx-auto px-8 text-center text-gray-500 text-xs">
            Copyright © 2025 Envisioner, Inc. All Rights Reserved.
          </div>
        </footer>
      )}
      </div>
    </div>
  );
};
