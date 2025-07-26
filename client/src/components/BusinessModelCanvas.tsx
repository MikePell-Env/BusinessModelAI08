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
import { BusinessModelCanvas as CanvasType } from '@/types/canvas';
import { Eye, Box, RotateCcw, Settings } from 'lucide-react';

export const BusinessModelCanvas: React.FC = () => {
  const {
    canvas,
    is3D,
    isTransitioning,
    error,
    loadCanvas,
    toggleView,
    setError
  } = useCanvas();
  


  useEffect(() => {
    // Load sample canvas data on component mount
    try {
      loadCanvas(sampleCanvasData as CanvasType);
    } catch (err) {
      console.error('Error loading canvas data:', err);
      setError('Failed to load canvas data');
    }
  }, [loadCanvas, setError]);

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
          onClick={() => is3D || handleToggleView()}
          disabled={isTransitioning || is3D}
          className={`border border-gray-300 shadow-md ${
            is3D ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white text-gray-800 hover:bg-gray-50'
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
