import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { useCanvas } from '@/lib/stores/useCanvas';
import { BusinessModelCanvas } from '@/types/canvas';
import { powerpointParser } from '@/utils/powerpointParser';

interface PowerPointImporterProps {
  onImportSuccess?: (canvas: BusinessModelCanvas) => void;
  onCancel?: () => void;
}

export const PowerPointImporter: React.FC<PowerPointImporterProps> = ({ 
  onImportSuccess, 
  onCancel 
}) => {
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
          // Parse the actual PowerPoint file
          const canvas = await powerpointParser.parseFile(file);
          loadCanvas(canvas, true);
          
          // Check if Income Statement data was loaded successfully
          const incomeStatementData = (canvas as any).incomeStatementData;
          
          if (incomeStatementData && incomeStatementData.years && incomeStatementData.years.length > 0) {
            // Success: Income Statement data loaded
            const yearsList = incomeStatementData.years.map((y: any) => y.year).join(', ');
            alert(`✅ INCOME STATEMENT DATA LOADED SUCCESSFULLY!\n\nFile: ${file.name}\nYears detected: ${yearsList}\nTotal years: ${incomeStatementData.years.length}\n\nYou can now switch to the Financials template to view and interact with this data.`);
          } else {
            // No Income Statement data found
            alert(`❌ NO INCOME STATEMENT DATA FOUND\n\nFile: ${file.name}\n\nThe PowerPoint was imported successfully, but no Income Statement data was detected. Make sure you have a slide titled "Financials", "Income Statement", or "Financial Statement" with yearly revenue and expense data.`);
          }
          
          // Call the success callback if provided
          if (onImportSuccess) {
            onImportSuccess(canvas);
          }
        } catch (error) {
          console.error('File processing error:', error);
          alert('❌ POWERPOINT IMPORT FAILED\n\nFailed to process PowerPoint file. Please ensure it follows the Business Model Canvas format.');
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
        className="flex items-center gap-2 bg-white border-gray-300 hover:bg-gray-50 shadow-md"
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