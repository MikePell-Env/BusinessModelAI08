import React from 'react';
import { Button } from '@/components/ui/button';

interface ImportSelectionPageProps {
  onNavigateHome?: () => void;
  onNavigateExplore?: () => void;
  onNavigateOverview?: () => void;
  onNavigateAbout?: () => void;
  currentPage?: 'home' | 'explore' | 'overview' | 'about' | 'import';
  onSelectImportMethod?: (method: 'office' | 'ai' | 'api') => void;
}

export const ImportSelectionPage: React.FC<ImportSelectionPageProps> = ({
  onNavigateHome,
  onNavigateExplore,
  onNavigateOverview,
  onNavigateAbout,
  onSelectImportMethod
}) => {
  const handleOfficeImport = () => {
    onSelectImportMethod?.('office');
  };

  const handleAIImport = () => {
    onSelectImportMethod?.('ai');
  };

  const handleAPIImport = () => {
    onSelectImportMethod?.('api');
  };

  return (
    <div className="w-full min-h-screen bg-gray-100">
      {/* Dark Header Section */}
      <div className="bg-slate-700 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-start gap-4">
            {/* Speech bubble icon */}
            <div className="flex-shrink-0 mt-1">
              <div className="w-12 h-12 border-2 border-white rounded-lg flex items-center justify-center">
                <div className="w-8 h-6 border-2 border-white rounded-sm relative">
                  <div className="absolute -bottom-2 left-3 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-white"></div>
                </div>
              </div>
            </div>
            
            {/* Header text */}
            <div>
              <h1 className="text-3xl font-bold mb-3">Envisioner Demo</h1>
              <p className="text-lg text-gray-300 leading-relaxed">
                Let's illustrate the value of an <span className="font-semibold text-white">Envisioner</span> by helping you analyze a{' '}
                <span className="font-semibold text-white">business model</span> in a very new way,{' '}
                unlocking the ability to play what-if and ask the hard questions...
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-8 text-center">
            Select how you want to import your business model information:
          </h2>
          
          {/* Import Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            
            {/* Option 1: Office */}
            <div className="border-2 border-gray-300 rounded-lg p-6 hover:border-blue-500 transition-colors">
              <div className="text-center">
                {/* Step number */}
                <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold text-lg mb-4">
                  1
                </div>
                
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Office</h3>
                
                {/* Office icons */}
                <div className="flex justify-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xl">P</span>
                  </div>
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xl">X</span>
                  </div>
                </div>
                
                <Button 
                  onClick={handleOfficeImport}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
                >
                  Import Office file...
                </Button>
              </div>
            </div>

            {/* Option 2: AI */}
            <div className="border-2 border-gray-300 rounded-lg p-6 hover:border-blue-500 transition-colors">
              <div className="text-center">
                {/* Step number */}
                <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold text-lg mb-4">
                  2
                </div>
                
                <h3 className="text-xl font-semibold text-gray-800 mb-4">AI</h3>
                
                {/* AI icon - colorful geometric shape */}
                <div className="flex justify-center mb-6">
                  <div className="w-12 h-12 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-green-500 rounded-lg transform rotate-12"></div>
                    <div className="absolute inset-1 bg-gradient-to-tr from-yellow-400 via-red-500 to-blue-600 rounded-lg transform -rotate-12"></div>
                  </div>
                </div>
                
                <Button 
                  onClick={handleAIImport}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
                >
                  Ask Copilot...
                </Button>
              </div>
            </div>

            {/* Option 3: API (Disabled) */}
            <div className="border-2 border-gray-200 rounded-lg p-6 opacity-50">
              <div className="text-center">
                {/* Step number */}
                <div className="inline-flex items-center justify-center w-8 h-8 bg-gray-400 text-white rounded-full font-bold text-lg mb-4">
                  3
                </div>
                
                <h3 className="text-xl font-semibold text-gray-500 mb-4">API</h3>
                
                {/* API icon - abstract geometric shape */}
                <div className="flex justify-center mb-6">
                  <div className="w-12 h-12 bg-gray-300 rounded-lg flex items-center justify-center">
                    <div className="w-8 h-8 bg-gray-400 rounded transform rotate-45"></div>
                  </div>
                </div>
                
                <Button 
                  onClick={handleAPIImport}
                  disabled
                  className="w-full bg-gray-300 text-gray-500 font-medium py-2 px-4 rounded cursor-not-allowed"
                >
                  Use MCP API
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};