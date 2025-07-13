import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useCanvas } from '@/lib/stores/useCanvas';
import { BusinessModelCanvas } from '@/types/canvas';
import samplePowerPointCanvas from '@/data/samplePowerPointCanvas.json';

interface ImportResult {
  success: boolean;
  canvas?: BusinessModelCanvas;
  error?: string;
}

export const PowerPointImporter: React.FC = () => {
  const { loadCanvas } = useCanvas();
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    console.log('File select clicked, fileInputRef:', fileInputRef.current);
    if (fileInputRef.current) {
      fileInputRef.current.click();
      console.log('File input clicked');
    } else {
      console.error('File input ref is null');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File change event:', event.target.files);
    const file = event.target.files?.[0];
    if (file) {
      console.log('Selected file:', file.name, 'Type:', file.type);
      if (file.type.includes('presentation') || file.name.endsWith('.pptx') || file.name.endsWith('.ppt')) {
        setSelectedFile(file);
        console.log('File accepted:', file.name);
      } else {
        console.log('File rejected, type:', file.type);
        alert('Please select a PowerPoint file (.pptx or .ppt)');
      }
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setImportResult(null);

    try {
      // For now, show that file upload is not implemented
      // In a real implementation, we'd process the file client-side
      // or send it to the server for processing
      setImportResult({ 
        success: false, 
        error: 'File upload processing is not yet implemented. Please use Microsoft Graph import or test with sample data.' 
      });
    } catch (error) {
      console.error('File upload error:', error);
      setImportResult({ 
        success: false, 
        error: 'Failed to upload PowerPoint file.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Import from PowerPoint
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Import Business Model Canvas from PowerPoint
          </DialogTitle>
        </DialogHeader>

        <div className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload PowerPoint File</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select PowerPoint File (.pptx)
                </label>
                <div className="flex items-center gap-3">
                  <Button 
                    onClick={handleFileSelect}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Choose File
                  </Button>
                  {selectedFile && (
                    <span className="text-sm text-gray-600">
                      {selectedFile.name}
                    </span>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pptx,.ppt"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <Button 
                onClick={handleFileUpload}
                disabled={!selectedFile || loading}
                className="w-full"
              >
                {loading ? 'Processing...' : 'Upload and Process PowerPoint'}
              </Button>

              {/* Import Result */}
              {importResult && (
                <div className={`p-3 rounded-md border ${
                  importResult.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {importResult.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${
                      importResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {importResult.success 
                        ? `Successfully imported: ${importResult.canvas?.name}`
                        : `Import failed: ${importResult.error}`
                      }
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};