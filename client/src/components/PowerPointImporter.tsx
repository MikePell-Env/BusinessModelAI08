import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Upload, FileText, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { useCanvas } from '@/lib/stores/useCanvas';
import { BusinessModelCanvas } from '@/types/canvas';
import samplePowerPointCanvas from '@/data/samplePowerPointCanvas.json';

interface ImportResult {
  success: boolean;
  canvas?: BusinessModelCanvas;
  error?: string;
}

export const PowerPointImporter: React.FC = () => {
  const { loadCanvas, setLoading, setError } = useCanvas();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [fileId, setFileId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [templateInstructions, setTemplateInstructions] = useState<string>('');

  const handleTestImport = async () => {
    setLoading(true);
    setImportResult(null);

    try {
      // Load sample PowerPoint canvas data directly
      const canvas = samplePowerPointCanvas as BusinessModelCanvas;
      loadCanvas(canvas);
      setImportResult({ success: true, canvas });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Test import error:', error);
      setImportResult({ 
        success: false, 
        error: 'Failed to load sample PowerPoint canvas data.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImportFromGraph = async () => {
    if (!fileId.trim()) {
      setError('Please enter a valid file ID');
      return;
    }

    setLoading(true);
    setImportResult(null);

    try {
      const response = await fetch('/api/import/powerpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: 'graph',
          fileId: fileId.trim(),
          siteId: siteId.trim() || undefined
        }),
      });

      const result: ImportResult = await response.json();

      if (result.success && result.canvas) {
        loadCanvas(result.canvas);
        setImportResult({ success: true, canvas: result.canvas });
        setIsDialogOpen(false);
        setFileId('');
        setSiteId('');
      } else {
        setImportResult({ success: false, error: result.error || 'Import failed' });
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportResult({ 
        success: false, 
        error: 'Failed to import PowerPoint file. Please check your connection and try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateInstructions = async () => {
    try {
      const response = await fetch('/api/import/powerpoint/template');
      const data = await response.json();
      if (data.success) {
        setTemplateInstructions(data.instructions);
      }
    } catch (error) {
      console.error('Failed to load template instructions:', error);
    }
  };

  React.useEffect(() => {
    if (isDialogOpen && !templateInstructions) {
      loadTemplateInstructions();
    }
  }, [isDialogOpen, templateInstructions]);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Import from PowerPoint
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Import Business Model Canvas from PowerPoint
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Import Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Microsoft Graph Import</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  File ID (OneDrive/SharePoint) *
                </label>
                <Input
                  placeholder="Enter the PowerPoint file ID from Microsoft Graph"
                  value={fileId}
                  onChange={(e) => setFileId(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Site ID (Optional - for SharePoint files)
                </label>
                <Input
                  placeholder="Enter SharePoint site ID if applicable"
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className="w-full"
                />
              </div>

              <Button 
                onClick={handleImportFromGraph}
                disabled={!fileId.trim()}
                className="w-full"
              >
                Import from Microsoft Graph
              </Button>

              <Button 
                onClick={handleTestImport}
                variant="outline"
                className="w-full"
              >
                Test Import with Sample Data
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

          {/* Template Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="w-5 h-5" />
                PowerPoint Template Format
              </CardTitle>
            </CardHeader>
            <CardContent>
              {templateInstructions ? (
                <pre className="text-xs whitespace-pre-wrap bg-gray-50 p-4 rounded-md overflow-x-auto">
                  {templateInstructions}
                </pre>
              ) : (
                <div className="text-sm text-gray-600">
                  Loading template instructions...
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Start Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <strong>1. Create Business Model Canvas:</strong>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>Create ONE PowerPoint slide that looks like a business model canvas</li>
                  <li>Add 9 text boxes arranged in the traditional canvas layout</li>
                  <li>Start each text box with section name (Key Partners, Value Propositions, etc.)</li>
                  <li>Use bullet points for business elements in each section</li>
                </ul>
              </div>
              
              <div>
                <strong>2. Save and Get File ID:</strong>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>Save PowerPoint to OneDrive or SharePoint</li>
                  <li>Copy the File ID from the URL</li>
                  <li>For SharePoint files, also get the Site ID</li>
                </ul>
              </div>
              
              <div>
                <strong>3. Test First:</strong>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>Click "Test Import with Sample Data" to see how it works</li>
                  <li>This loads a sample TechCorp AI Platform business model</li>
                  <li>Shows exactly what imported PowerPoint canvas looks like</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};