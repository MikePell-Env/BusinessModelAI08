import { OverviewData } from '@/types/canvas';

export class OverviewAnalyzer {
  async analyzeBusinessContent(allSlideText: string, companyName: string): Promise<OverviewData> {
    try {
      // Use Microsoft Copilot backend service instead of direct OpenAI
      const response = await fetch('/api/copilot/analyze-overview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slideText: allSlideText,
          companyName: companyName
        }),
      });

      if (!response.ok) {
        throw new Error(`Microsoft Copilot analysis failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.overviewData) {
        return result.overviewData;
      } else {
        throw new Error(result.error || 'Failed to analyze content');
      }

    } catch (error) {
      console.error('Error analyzing business content with Microsoft Copilot:', error);
      
      // Return fallback content
      return {
        companyName: companyName || 'Your Company',
        summary: [
          'Business overview will be extracted from your PowerPoint presentation using Microsoft Copilot.',
          'Upload a presentation to see detailed company summary and market analysis.',
          'This section will provide AI-powered insights into your business model and opportunities.'
        ],
        founders: [
          'Founder and leadership information will be analyzed and displayed here.',
          'Microsoft Copilot will extract details about the team background and experience.',
          'Upload your presentation to see AI-analyzed team member profiles and expertise.'
        ],
        details: [
          'Detailed business information will be extracted from your slides using Microsoft Graph insights.',
          'This includes target market analysis, competitive advantages, and business strategy recommendations.',
          'Provide a PowerPoint file to populate this section with Microsoft Copilot-powered analysis.'
        ]
      };
    }
  }
}

export const overviewAnalyzer = new OverviewAnalyzer();