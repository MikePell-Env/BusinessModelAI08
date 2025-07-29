import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BusinessModelCanvas, CanvasElement } from '@/types/canvas';
import { useCanvas } from '@/lib/stores/useCanvas';

interface Canvas2DProps {
  canvas: BusinessModelCanvas;
  isTransitioning: boolean;
}

const CanvasBlock: React.FC<{ 
  element: CanvasElement; 
  className?: string;
  hasImportedFromPowerPoint: boolean;
}> = ({ 
  element, 
  className = "",
  hasImportedFromPowerPoint
}) => (
  <Card 
    className={`h-full transition-all duration-300 hover:shadow-lg ${className}`}
    style={{ 
      backgroundColor: hasImportedFromPowerPoint ? 'white' : '#d1d5db' // gray-300 when no import, white after import
    }}
  >
    <CardHeader className="pb-2">
      <CardTitle className={`text-sm font-semibold ${hasImportedFromPowerPoint ? 'text-gray-800' : 'text-gray-400'}`}>
        {element.title}
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <ul className="space-y-1">
        {element.content.map((item, index) => (
          <li key={index} className={`text-xs leading-relaxed ${hasImportedFromPowerPoint ? 'text-gray-700' : 'text-gray-400'}`}>
            • {item}
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);

export const Canvas2D: React.FC<Canvas2DProps> = ({ canvas, isTransitioning }) => {
  const { hasImportedFromPowerPoint } = useCanvas();
  
  if (!canvas) return null;

  return (
    <div 
      className="w-full h-full p-6"
      style={{ backgroundColor: '#e9ecef' }}
    >
      {/* Header - positioned below button group */}
      <div className="mb-6 text-center pt-20">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{canvas.name}</h1>
        <p className="text-gray-600">{canvas.description}</p>
      </div>

      {/* Business Model Canvas Grid */}
      <div className="grid grid-cols-10 grid-rows-3 gap-4 h-5/6 max-w-7xl mx-auto">
        {/* Row 1 */}
        <CanvasBlock element={canvas.keyPartners} className="row-span-2 col-span-2" hasImportedFromPowerPoint={hasImportedFromPowerPoint} />
        <CanvasBlock element={canvas.keyActivities} className="col-span-2" hasImportedFromPowerPoint={hasImportedFromPowerPoint} />
        <CanvasBlock element={canvas.valuePropositions} className="row-span-2 col-span-2" hasImportedFromPowerPoint={hasImportedFromPowerPoint} />
        <CanvasBlock element={canvas.customerRelationships} className="col-span-2" hasImportedFromPowerPoint={hasImportedFromPowerPoint} />
        <CanvasBlock element={canvas.customerSegments} className="row-span-2 col-span-2" hasImportedFromPowerPoint={hasImportedFromPowerPoint} />
        
        {/* Row 2 */}
        <CanvasBlock element={canvas.keyResources} className="col-span-2" hasImportedFromPowerPoint={hasImportedFromPowerPoint} />
        <CanvasBlock element={canvas.channels} className="col-span-2" hasImportedFromPowerPoint={hasImportedFromPowerPoint} />
        
        {/* Row 3 - Bottom boxes with cost structure 20% wider */}
        <CanvasBlock element={canvas.costStructure} className="col-span-5" hasImportedFromPowerPoint={hasImportedFromPowerPoint} />
        <CanvasBlock element={canvas.revenueStreams} className="col-span-5" hasImportedFromPowerPoint={hasImportedFromPowerPoint} />
      </div>
    </div>
  );
};
