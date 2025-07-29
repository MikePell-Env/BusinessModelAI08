import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCanvas } from '@/lib/stores/useCanvas';
import { Canvas2D } from './Canvas2D';
import { Canvas3DBabylon } from './Canvas3DBabylon';
import { AIChat } from './AIChat';
import { MicrosoftStackStatus } from './MicrosoftStackStatus';
import { PowerPointImporter } from './PowerPointImporter';
import { MicrosoftRecommendations } from './MicrosoftRecommendations';
import sampleCanvasData from '@/data/sampleCanvas.json';
import samplePowerPointData from '@/data/samplePowerPointCanvas.json';
import { BusinessModelCanvas as CanvasType } from '@/types/canvas';
import { Eye, Box, RotateCcw, RectangleHorizontal, Settings } from 'lucide-react';
import { powerpointParser } from '@/utils/powerpointParser';

export const BusinessModelCanvas: React.FC = () => {
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
  


  useEffect(() => {
    console.log('🎯 BusinessModelCanvas: useEffect triggered, pendingPowerPointFile:', pendingPowerPointFile);
    
    // Check if there's a pending PowerPoint file to process
    if (pendingPowerPointFile) {
      console.log('🎯 BusinessModelCanvas: Found pending PowerPoint file:', pendingPowerPointFile.name);
      console.log('🎯 BusinessModelCanvas: Testing with sample PowerPoint data first...');
      
      // TEMPORARY TEST: Use sample PowerPoint data to verify the flow works
      try {
        loadCanvas(samplePowerPointData as CanvasType, true); // Set isFromPowerPoint flag to true
        console.log('🎯 BusinessModelCanvas: Sample PowerPoint data loaded with isFromPowerPoint=true');
        setPendingPowerPointFile(null); // Clear the pending file
      } catch (error) {
        console.error('Error loading sample PowerPoint data:', error);
        setError('Failed to load PowerPoint data');
        setPendingPowerPointFile(null);
      }
      
      /* 
      // ORIGINAL CODE - will restore after testing
      const processPowerPointFile = async () => {
        try {
          console.log('🎯 BusinessModelCanvas: Starting PowerPoint parsing...');
          const canvas = await powerpointParser.parseFile(pendingPowerPointFile);
          console.log('🎯 BusinessModelCanvas: PowerPoint parsed successfully:', canvas);
          console.log('🎯 BusinessModelCanvas: Sample content from parsed canvas:', {
            keyPartners: canvas.keyPartners.content,
            valuePropositions: canvas.valuePropositions.content
          });
          
          loadCanvas(canvas, true); // Set isFromPowerPoint flag to true
          console.log('🎯 BusinessModelCanvas: Canvas loaded with isFromPowerPoint=true');
          setPendingPowerPointFile(null); // Clear the pending file
        } catch (error) {
          console.error('PowerPoint processing error:', error);
          setError('Failed to process PowerPoint file. Please ensure it follows the Business Model Canvas format.');
          setPendingPowerPointFile(null); // Clear the pending file even on error
          
          // Load sample canvas as fallback
          loadCanvas(sampleCanvasData as CanvasType);
        }
      };
      
      processPowerPointFile();
      */
    } else {
      console.log('🎯 BusinessModelCanvas: No pending PowerPoint file, loading sample canvas data');
      // Load sample canvas data on component mount only if no PowerPoint file is pending
      try {
        loadCanvas(sampleCanvasData as CanvasType);
      } catch (err) {
        console.error('Error loading canvas data:', err);
        setError('Failed to load canvas data');
      }
    }
  }, [loadCanvas, setError, pendingPowerPointFile, setPendingPowerPointFile]);

  const handleToggleView = () => {
    console.log(`Switching to ${is3D ? '2D' : '3D'} view`);
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
    <div className="relative w-full h-full bg-white">
      {/* Header Controls */}
      <div className="absolute top-4 left-4 z-40 flex space-x-2">
        <Button
          onClick={() => !is3D || handleToggleView()}
          disabled={isTransitioning || !is3D}
          className={`border border-gray-300 shadow-md ${
            !is3D ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white text-gray-800 hover:bg-gray-50'
          }`}
          size="sm"
        >
          <Eye className="w-4 h-4 mr-2" />
          2D View
        </Button>

        <Button
          onClick={() => setOrthographicView(true)}
          disabled={isTransitioning}
          className={`border border-gray-300 shadow-md ${
            isOrthographic ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white text-gray-800 hover:bg-gray-50'
          }`}
          size="sm"
        >
          <RectangleHorizontal className="w-4 h-4 mr-2" />
          3D Top
        </Button>

        <Button
          onClick={() => setOrthographicView(false)}
          disabled={isTransitioning}
          className={`border border-gray-300 shadow-md ${
            is3D && !isOrthographic ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white text-gray-800 hover:bg-gray-50'
          }`}
          size="sm"
        >
          <Box className="w-4 h-4 mr-2" />
          3D View
        </Button>
      </div>

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
          <Canvas3DBabylon canvas={canvas} isTransitioning={isTransitioning} />
        ) : (
          <Canvas2D canvas={canvas} isTransitioning={isTransitioning} />
        )}
      </div>

      {/* AI Chat Component */}
      <AIChat />

      {/* PowerPoint Import Button - Bottom Center */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-40">
        <PowerPointImporter />
      </div>
    </div>
  );
};
