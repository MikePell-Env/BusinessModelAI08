import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BusinessModelCanvas } from './BusinessModelCanvas';
import { Play, ArrowRight, Eye, Box, RectangleHorizontal } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [showCanvas, setShowCanvas] = useState(false);

  if (showCanvas) {
    return <BusinessModelCanvas />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="w-full px-8 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Box className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Envisioner</h1>
          </div>
          
          <nav className="flex items-center space-x-6">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
              Features
            </Button>
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
              Documentation
            </Button>
            <Button 
              onClick={() => setShowCanvas(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
            >
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Business Model Canvas
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Transform your business ideas into interactive 3D visualizations. 
            Create, analyze, and refine your business model with AI-powered insights.
          </p>
          <p className="text-lg text-blue-600 mb-12">
            Import a PowerPoint slide to begin
          </p>
          
          <div className="flex items-center justify-center space-x-4 mb-12">
            <Button 
              onClick={() => setShowCanvas(true)}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
            >
              <Play className="w-5 h-5 mr-2" />
              Launch Canvas
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="px-8 py-4 text-lg"
              onClick={() => setShowCanvas(true)}
            >
              View Demo
            </Button>
          </div>
        </div>

        {/* Feature Tabs */}
        <div className="mb-12">
          <div className="flex justify-center space-x-2 mb-8">
            <button className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">
              <Eye className="w-4 h-4 mr-2" />
              2D View
            </button>
            <button className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">
              <RectangleHorizontal className="w-4 h-4 mr-2" />
              3D Top
            </button>
            <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow-md">
              <Box className="w-4 h-4 mr-2" />
              3D View
            </button>
          </div>
        </div>

        {/* 3D Canvas Preview */}
        <div className="relative max-w-5xl mx-auto">
          <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl shadow-2xl overflow-hidden">
            <div className="w-full h-full flex items-center justify-center relative">
              {/* Canvas Preview Image */}
              <div className="relative w-4/5 h-4/5 perspective-1000">
                <div className="w-full h-full transform rotate-x-12 rotate-y-6 shadow-xl rounded-lg bg-blue-50 border-4 border-gray-300">
                  <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-1 p-4">
                    {/* Key Partners */}
                    <div className="bg-gray-700 rounded flex items-center justify-center text-white text-sm font-medium">
                      Key Partners
                    </div>
                    
                    {/* Key Activities */}
                    <div className="bg-gray-700 rounded flex items-center justify-center text-white text-sm font-medium">
                      Key Activities
                    </div>
                    
                    {/* Customer Relationships */}
                    <div className="bg-gray-700 rounded flex items-center justify-center text-white text-sm font-medium">
                      Customer Relationships
                    </div>
                    
                    {/* Key Resources */}
                    <div className="bg-gray-700 rounded flex items-center justify-center text-white text-sm font-medium">
                      Key Resources
                    </div>
                    
                    {/* Value Propositions - Center Circle */}
                    <div className="relative flex items-center justify-center">
                      <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-lg">
                        Value Proposition
                      </div>
                      <div className="absolute inset-0 border-4 border-blue-300 rounded-full animate-pulse"></div>
                    </div>
                    
                    {/* Customer Segments */}
                    <div className="bg-gray-700 rounded flex items-center justify-center text-white text-sm font-medium">
                      Customer Segments
                    </div>
                    
                    {/* Empty */}
                    <div></div>
                    
                    {/* Customer Channels */}
                    <div className="bg-gray-700 rounded flex items-center justify-center text-white text-sm font-medium">
                      Customer Channels
                    </div>
                    
                    {/* Empty */}
                    <div></div>
                  </div>
                </div>
              </div>
              
              {/* Overlay Call to Action */}
              <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
                <Button 
                  onClick={() => setShowCanvas(true)}
                  size="lg"
                  className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-4 text-lg shadow-xl"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Building
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Box className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">3D Visualization</h3>
            <p className="text-gray-600">
              Transform flat business models into interactive 3D experiences with dynamic height manipulation and perspective views.
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">AI-Powered Insights</h3>
            <p className="text-gray-600">
              Get intelligent recommendations and analysis powered by Microsoft Copilot and OpenAI integration.
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ArrowRight className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">PowerPoint Integration</h3>
            <p className="text-gray-600">
              Import your existing PowerPoint business model slides and watch them come to life in 3D.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-8 text-center text-gray-600">
          <p>Built with React, Babylon.js, and AI-powered business intelligence</p>
        </div>
      </footer>
    </div>
  );
};