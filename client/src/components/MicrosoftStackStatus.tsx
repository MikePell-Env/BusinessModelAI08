import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface StackStatus {
  component: string;
  status: 'available' | 'unavailable' | 'testing' | 'error';
  description: string;
  details?: string;
}

export const MicrosoftStackStatus: React.FC = () => {
  const [stackStatus, setStackStatus] = useState<StackStatus[]>([
    {
      component: 'Babylon.js 3D Engine',
      status: 'available',
      description: 'Microsoft-owned 3D engine for web applications',
      details: 'Successfully integrated with React components'
    },
    {
      component: 'Microsoft Copilot API',
      status: 'unavailable',
      description: 'AI-powered business analysis service',
      details: 'Requires Microsoft 365 Copilot license and authentication'
    },
    {
      component: 'Microsoft Azure hosting',
      status: 'unavailable',
      description: 'Cloud platform for production deployment',
      details: 'Ready for deployment configuration'
    },
    {
      component: 'Microsoft Fabric',
      status: 'unavailable',
      description: 'Data integration for PowerPoint/Excel sources',
      details: 'Planned for future implementation'
    }
  ]);

  const [isTestingCopilot, setIsTestingCopilot] = useState(false);

  const testCopilotConnection = async () => {
    setIsTestingCopilot(true);
    
    try {
      // Test Microsoft Copilot API connection
      const response = await fetch('/api/test-copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test: true
        }),
      });

      const result = await response.json();
      
      setStackStatus(prev => prev.map(item => 
        item.component === 'Microsoft Copilot API' 
          ? { 
              ...item, 
              status: result.success ? 'available' : 'error',
              details: result.message || 'Connection test completed'
            }
          : item
      ));
    } catch (error) {
      setStackStatus(prev => prev.map(item => 
        item.component === 'Microsoft Copilot API' 
          ? { 
              ...item, 
              status: 'error',
              details: 'Connection test failed'
            }
          : item
      ));
    } finally {
      setIsTestingCopilot(false);
    }
  };

  const getStatusIcon = (status: StackStatus['status']) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'unavailable':
        return <XCircle className="w-5 h-5 text-gray-400" />;
      case 'testing':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <XCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: StackStatus['status']) => {
    switch (status) {
      case 'available':
        return <Badge variant="default" className="bg-green-100 text-green-800">Available</Badge>;
      case 'unavailable':
        return <Badge variant="secondary">Not Configured</Badge>;
      case 'testing':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Testing...</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Microsoft Technology Stack Status</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stackStatus.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(item.status)}
                <div>
                  <h3 className="font-semibold text-gray-900">{item.component}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                  {item.details && (
                    <p className="text-xs text-gray-500 mt-1">{item.details}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(item.status)}
                {item.component === 'Microsoft Copilot API' && (
                  <Button
                    onClick={testCopilotConnection}
                    disabled={isTestingCopilot}
                    size="sm"
                    variant="outline"
                  >
                    {isTestingCopilot ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      'Test Connection'
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Migration Progress</h4>
          <div className="text-sm text-blue-800">
            <p>✅ <strong>Babylon.js Integration</strong> - 3D rendering engine successfully integrated</p>
            <p>🔄 <strong>Microsoft Copilot API</strong> - Integration ready, requires authentication setup</p>
            <p>⏳ <strong>Azure Deployment</strong> - Ready for production deployment configuration</p>
            <p>📋 <strong>Microsoft Fabric</strong> - Planned for PowerPoint/Excel data integration</p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
          <h4 className="font-semibold text-yellow-900 mb-2">Next Steps</h4>
          <div className="text-sm text-yellow-800">
            <p>1. Configure Microsoft Graph API credentials for Copilot access</p>
            <p>2. Set up Azure hosting environment for production deployment</p>
            <p>3. Implement Microsoft Fabric connectors for data sources</p>
            <p>4. Test end-to-end Microsoft technology stack integration</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};