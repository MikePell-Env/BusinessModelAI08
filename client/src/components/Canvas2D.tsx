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
  isSelected: boolean;
  onSelect: () => void;
}> = ({ 
  element, 
  className = "",
  hasImportedFromPowerPoint,
  isSelected,
  onSelect
}) => (
  <Card 
    className={`h-full transition-all duration-300 hover:shadow-lg cursor-pointer ${className} ${
      isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
    }`}
    style={{ 
      backgroundColor: isSelected 
        ? '#dbeafe' // Light blue when selected
        : hasImportedFromPowerPoint ? 'white' : '#d1d5db' // gray-300 when no import, white after import
    }}
    onClick={onSelect}
  >
    <CardHeader className="pb-2">
      <CardTitle className={`text-sm font-semibold ${
        isSelected 
          ? 'text-blue-800' 
          : hasImportedFromPowerPoint ? 'text-gray-800' : 'text-gray-400'
      }`}>
        {element.title}
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <ul className="space-y-1">
        {element.content.map((item, index) => (
          <li key={index} className={`text-xs leading-relaxed ${
            isSelected 
              ? 'text-blue-700' 
              : hasImportedFromPowerPoint ? 'text-gray-700' : 'text-gray-400'
          }`}>
            • {item}
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);

export const Canvas2D: React.FC<Canvas2DProps> = ({ canvas, isTransitioning }) => {
  const { hasImportedFromPowerPoint, getSelectedObject, selectObject } = useCanvas();
  
  if (!canvas) return null;
  
  const selectedObject = getSelectedObject();
  
  // Helper function to map section titles to their names used in 3D view
  const getSectionName = (title: string): string => {
    const mapping: { [key: string]: string } = {
      'Key Partners': 'KeyPartners',
      'Key Activities': 'KeyActivities', 
      'Key Resources': 'KeyResources',
      'Value Propositions': 'ValueProposition',
      'Customer Relationships': 'CustomerRelationships',
      'Customer Channels': 'CustomerChannels',
      'Customer Segments': 'CustomerSegments',
      'Cost Structure': 'CostStructure',
      'Revenue Streams': 'RevenueStreams'
    };
    return mapping[title] || title;
  };
  
  const handleSectionSelect = (sectionTitle: string) => {
    const sectionName = getSectionName(sectionTitle);
    const isCurrentlySelected = selectedObject === sectionName;
    
    console.log(`🎯 2D Click on: ${sectionTitle} -> ${sectionName}`);
    console.log(`🎯 Currently selected: ${selectedObject}, isCurrentlySelected: ${isCurrentlySelected}`);
    
    // Toggle selection using unified BMC system
    selectObject(isCurrentlySelected ? null : sectionName as any);
    console.log(`📋 2D View: ${isCurrentlySelected ? 'Deselected' : 'Selected'} "${sectionName}"`);
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    // Only clear selection if clicking the background (not on any card)
    if (e.target === e.currentTarget) {
      selectObject(null);
      console.log('📋 2D View: Cleared selection (background click)');
    }
  };

  return (
    <div 
      className="w-full h-full p-6"
      style={{ backgroundColor: '#e9ecef' }}
      onClick={handleBackgroundClick}
    >
      {/* Header - centered horizontally in upper area */}
      <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-10">
        <h1 className="text-xl font-medium text-gray-900" style={{ fontFamily: 'Segoe UI, sans-serif' }}>{canvas.name}</h1>
      </div>

      {/* Business Model Canvas Grid */}
      <div className="grid grid-cols-10 grid-rows-3 gap-4 h-5/6 max-w-7xl mx-auto">
        {/* Row 1 */}
        <CanvasBlock 
          element={canvas.keyPartners} 
          className="row-span-2 col-span-2" 
          hasImportedFromPowerPoint={hasImportedFromPowerPoint}
          isSelected={selectedObject === getSectionName(canvas.keyPartners.title)}
          onSelect={() => handleSectionSelect(canvas.keyPartners.title)}
        />
        <CanvasBlock 
          element={canvas.keyActivities} 
          className="col-span-2" 
          hasImportedFromPowerPoint={hasImportedFromPowerPoint}
          isSelected={selectedObject === getSectionName(canvas.keyActivities.title)}
          onSelect={() => handleSectionSelect(canvas.keyActivities.title)}
        />
        <CanvasBlock 
          element={canvas.valuePropositions} 
          className="row-span-2 col-span-2" 
          hasImportedFromPowerPoint={hasImportedFromPowerPoint}
          isSelected={selectedObject === getSectionName(canvas.valuePropositions.title)}
          onSelect={() => handleSectionSelect(canvas.valuePropositions.title)}
        />
        <CanvasBlock 
          element={canvas.customerRelationships} 
          className="col-span-2" 
          hasImportedFromPowerPoint={hasImportedFromPowerPoint}
          isSelected={selectedObject === getSectionName(canvas.customerRelationships.title)}
          onSelect={() => handleSectionSelect(canvas.customerRelationships.title)}
        />
        <CanvasBlock 
          element={canvas.customerSegments} 
          className="row-span-2 col-span-2" 
          hasImportedFromPowerPoint={hasImportedFromPowerPoint}
          isSelected={selectedObject === getSectionName(canvas.customerSegments.title)}
          onSelect={() => handleSectionSelect(canvas.customerSegments.title)}
        />
        
        {/* Row 2 */}
        <CanvasBlock 
          element={canvas.keyResources} 
          className="col-span-2" 
          hasImportedFromPowerPoint={hasImportedFromPowerPoint}
          isSelected={selectedObject === getSectionName(canvas.keyResources.title)}
          onSelect={() => handleSectionSelect(canvas.keyResources.title)}
        />
        <CanvasBlock 
          element={canvas.channels} 
          className="col-span-2" 
          hasImportedFromPowerPoint={hasImportedFromPowerPoint}
          isSelected={selectedObject === getSectionName(canvas.channels.title)}
          onSelect={() => handleSectionSelect(canvas.channels.title)}
        />
        
        {/* Row 3 - Bottom boxes with cost structure 20% wider */}
        <CanvasBlock 
          element={canvas.costStructure} 
          className="col-span-5" 
          hasImportedFromPowerPoint={hasImportedFromPowerPoint}
          isSelected={selectedObject === getSectionName(canvas.costStructure.title)}
          onSelect={() => handleSectionSelect(canvas.costStructure.title)}
        />
        <CanvasBlock 
          element={canvas.revenueStreams} 
          className="col-span-5" 
          hasImportedFromPowerPoint={hasImportedFromPowerPoint}
          isSelected={selectedObject === getSectionName(canvas.revenueStreams.title)}
          onSelect={() => handleSectionSelect(canvas.revenueStreams.title)}
        />
      </div>
    </div>
  );
};
