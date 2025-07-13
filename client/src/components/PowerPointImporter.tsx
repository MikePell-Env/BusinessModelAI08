import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { useCanvas } from '@/lib/stores/useCanvas';
import { BusinessModelCanvas } from '@/types/canvas';
import samplePowerPointCanvas from '@/data/samplePowerPointCanvas.json';

export const PowerPointImporter: React.FC = () => {
  const { loadCanvas } = useCanvas();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      console.error('File input ref is null');
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.includes('presentation') || file.name.endsWith('.pptx') || file.name.endsWith('.ppt')) {
        setSelectedFile(file);
        
        // Automatically process the file when selected
        setLoading(true);
        try {
          // For demonstration, load the sample canvas
          const canvas = samplePowerPointCanvas as BusinessModelCanvas;
          loadCanvas(canvas);
        } catch (error) {
          console.error('File processing error:', error);
          alert('Failed to process PowerPoint file.');
        } finally {
          setLoading(false);
          // Reset file input for next use
          if (event.target) {
            event.target.value = '';
          }
          setSelectedFile(null);
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

  return (
    <>
      <Button 
        variant="outline" 
        className="flex items-center gap-2"
        onClick={handleImportClick}
        disabled={loading}
      >
        <Upload className="w-4 h-4" />
        {loading ? 'Processing...' : 'Import from PowerPoint'}
      </Button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".pptx,.ppt"
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
};