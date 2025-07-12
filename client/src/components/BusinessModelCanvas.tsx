import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCanvas } from '@/lib/stores/useCanvas';
import { Canvas2D } from './Canvas2D';
import { Canvas3D } from './Canvas3D';
import { Canvas3DSimple } from './Canvas3DSimple';
import { Canvas3DBabylon } from './Canvas3DBabylon';
import { AIChat } from './AIChat';
import { MicrosoftStackStatus } from './MicrosoftStackStatus';
import sampleCanvasData from '@/data/sampleCanvas.json';
import { BusinessModelCanvas as CanvasType } from '@/types/canvas';
import { Eye, Box, RotateCcw, Layers, Settings } from 'lucide-react';

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
  
  const [renderMode, setRenderMode] = useState<'complex' | 'simple' | 'babylon'>('simple');

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
          className={`text-gray-800 border border-gray-300 hover:bg-gray-50 shadow-md ${
            !is3D ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-white'
          }`}
          size="sm"
        >
          <Eye className="w-4 h-4 mr-2" />
          2D View
        </Button>

        <Button
          onClick={() => is3D || handleToggleView()}
          disabled={isTransitioning || is3D}
          className={`text-gray-800 border border-gray-300 hover:bg-gray-50 shadow-md ${
            is3D ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-white'
          }`}
          size="sm"
        >
          <Box className="w-4 h-4 mr-2" />
          3D View
        </Button>

        {/* 3D Render Mode Selector */}
        {is3D && (
          <div className="flex space-x-1">
            <Button
              onClick={() => setRenderMode('simple')}
              className={`text-xs border border-gray-300 hover:bg-gray-50 shadow-md ${
                renderMode === 'simple' ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-white text-gray-800'
              }`}
              size="sm"
            >
              Simple
            </Button>
            <Button
              onClick={() => setRenderMode('complex')}
              className={`text-xs border border-gray-300 hover:bg-gray-50 shadow-md ${
                renderMode === 'complex' ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-white text-gray-800'
              }`}
              size="sm"
            >
              Complex
            </Button>
            <Button
              onClick={() => setRenderMode('babylon')}
              className={`text-xs border border-gray-300 hover:bg-gray-50 shadow-md ${
                renderMode === 'babylon' ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-white text-gray-800'
              }`}
              size="sm"
            >
              Babylon.js
            </Button>
          </div>
        )}

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
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Microsoft Technology Stack Migration</DialogTitle>
            </DialogHeader>
            <MicrosoftStackStatus />
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
          renderMode === 'simple' ? (
            <Canvas3DSimple canvas={canvas} isTransitioning={isTransitioning} />
          ) : renderMode === 'babylon' ? (
            <Canvas3DBabylon canvas={canvas} isTransitioning={isTransitioning} />
          ) : (
            <Canvas3D canvas={canvas} isTransitioning={isTransitioning} />
          )
        ) : (
          <Canvas2D canvas={canvas} isTransitioning={isTransitioning} />
        )}
      </div>

      {/* AI Chat Component */}
      <AIChat />
    </div>
  );
};
