import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Cloud, Zap, Users, Brain } from 'lucide-react';
import { BusinessModelCanvas } from '@/types/canvas';

interface MicrosoftRecommendation {
  service: string;
  category: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

interface TechnologyRecommendation {
  technology: string;
  reason: string;
  microsoftIntegration: string;
}

interface MicrosoftRecommendationsProps {
  canvas: BusinessModelCanvas;
}

export const MicrosoftRecommendations: React.FC<MicrosoftRecommendationsProps> = ({ canvas }) => {
  const [recommendations, setRecommendations] = useState<MicrosoftRecommendation[]>([]);
  const [techRecommendations, setTechRecommendations] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const generateRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/copilot/technology-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ canvas }),
      });

      if (response.ok) {
        const data = await response.json();
        setTechRecommendations(data.recommendations);
        
        // Also get business recommendations
        const analysisResponse = await fetch('/api/copilot/analyze-canvas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ canvas }),
        });

        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json();
          setRecommendations(analysisData.microsoftRecommendations || []);
        }
      }
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'cloud infrastructure': return <Cloud className="w-4 h-4" />;
      case 'automation': return <Zap className="w-4 h-4" />;
      case 'communication': return <Users className="w-4 h-4" />;
      case 'artificial intelligence': return <Brain className="w-4 h-4" />;
      default: return <ExternalLink className="w-4 h-4" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <img 
            src="/attached_assets/Microsoft-Copilot-Logo 64x64_1752366242557.png" 
            alt="Microsoft Copilot" 
            className="w-6 h-6" 
          />
          Microsoft Ecosystem Recommendations
        </CardTitle>
        <p className="text-sm text-gray-600">
          Get personalized Microsoft technology recommendations for your business model
        </p>
      </CardHeader>
      <CardContent>
        {!expanded ? (
          <Button 
            onClick={() => {
              setExpanded(true);
              generateRecommendations();
            }}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Analyzing Business Model...' : 'Get Microsoft Recommendations'}
          </Button>
        ) : (
          <div className="space-y-6">
            {/* Business Recommendations */}
            {recommendations.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Service Recommendations</h3>
                <div className="grid gap-3">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(rec.category)}
                          <h4 className="font-medium">{rec.service}</h4>
                        </div>
                        <Badge variant="secondary" className={getPriorityColor(rec.priority)}>
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{rec.category}</p>
                      <p className="text-sm">{rec.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Technology Stack Recommendations */}
            {techRecommendations && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Technology Stack</h3>
                <div className="grid gap-4">
                  {Object.entries(techRecommendations).map(([category, techs]) => (
                    <div key={category} className="border rounded-lg p-3">
                      <h4 className="font-medium mb-2 capitalize">{category}</h4>
                      <div className="space-y-2">
                        {(techs as TechnologyRecommendation[]).map((tech, index) => (
                          <div key={index} className="bg-gray-50 rounded p-2">
                            <div className="font-medium text-sm">{tech.technology}</div>
                            <div className="text-xs text-gray-600 mb-1">{tech.reason}</div>
                            <div className="text-xs text-blue-600">{tech.microsoftIntegration}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setExpanded(false)}
                className="flex-1"
              >
                Collapse
              </Button>
              <Button
                onClick={generateRecommendations}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Refreshing...' : 'Refresh Recommendations'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};