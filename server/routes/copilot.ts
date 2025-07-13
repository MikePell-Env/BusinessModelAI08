import { Router } from 'express';
import { microsoftAuth } from '../services/microsoftAuth';
import { processCopilotChat, analyzeCopilotCanvas } from '../services/microsoftCopilot';
import { BusinessModelCanvas } from '@/types/canvas';

const router = Router();

/**
 * Test Microsoft Copilot connection
 */
router.post('/test-copilot', async (req, res) => {
  try {
    const testResult = await microsoftAuth.testConnection();
    res.json(testResult);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Microsoft Copilot test failed: ${error.message}`
    });
  }
});

/**
 * Get Microsoft ecosystem recommendations for a business model
 */
router.post('/analyze-canvas', async (req, res) => {
  try {
    const { canvas }: { canvas: BusinessModelCanvas } = req.body;
    
    if (!canvas) {
      return res.status(400).json({
        error: 'Canvas data is required'
      });
    }

    const analysis = await analyzeCopilotCanvas(canvas);
    
    res.json({
      success: true,
      analysis,
      microsoftRecommendations: generateMicrosoftRecommendations(canvas)
    });
    
  } catch (error) {
    console.error('Canvas analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze canvas',
      details: error.message
    });
  }
});

/**
 * Get Microsoft technology stack recommendations based on business model
 */
router.post('/technology-recommendations', async (req, res) => {
  try {
    const { canvas }: { canvas: BusinessModelCanvas } = req.body;
    
    const recommendations = generateTechnologyRecommendations(canvas);
    
    res.json({
      success: true,
      recommendations
    });
    
  } catch (error) {
    console.error('Technology recommendations error:', error);
    res.status(500).json({
      error: 'Failed to generate technology recommendations',
      details: error.message
    });
  }
});

/**
 * Generate Microsoft ecosystem recommendations based on business model
 */
function generateMicrosoftRecommendations(canvas: BusinessModelCanvas) {
  const recommendations = [];
  
  // Analyze customer segments for Teams integration
  if (canvas.customerSegments.content.some(segment => 
    segment.toLowerCase().includes('enterprise') || 
    segment.toLowerCase().includes('business') ||
    segment.toLowerCase().includes('corporate')
  )) {
    recommendations.push({
      service: 'Microsoft Teams',
      category: 'Communication',
      recommendation: 'Integrate Teams for enterprise customer engagement and support',
      priority: 'high'
    });
  }
  
  // Analyze key activities for Power Platform
  if (canvas.keyActivities.content.some(activity => 
    activity.toLowerCase().includes('process') || 
    activity.toLowerCase().includes('workflow') ||
    activity.toLowerCase().includes('automation')
  )) {
    recommendations.push({
      service: 'Power Platform',
      category: 'Automation',
      recommendation: 'Use Power Automate for workflow automation and Power Apps for custom business applications',
      priority: 'high'
    });
  }
  
  // Analyze value propositions for Azure AI
  if (canvas.valuePropositions.content.some(prop => 
    prop.toLowerCase().includes('ai') || 
    prop.toLowerCase().includes('intelligent') ||
    prop.toLowerCase().includes('smart') ||
    prop.toLowerCase().includes('analytics')
  )) {
    recommendations.push({
      service: 'Azure AI Services',
      category: 'Artificial Intelligence',
      recommendation: 'Leverage Azure Cognitive Services and Azure OpenAI for enhanced AI capabilities',
      priority: 'high'
    });
  }
  
  // Analyze channels for Microsoft 365
  if (canvas.channels.content.some(channel => 
    channel.toLowerCase().includes('email') || 
    channel.toLowerCase().includes('document') ||
    channel.toLowerCase().includes('collaboration')
  )) {
    recommendations.push({
      service: 'Microsoft 365',
      category: 'Productivity',
      recommendation: 'Integrate with Outlook, SharePoint, and OneDrive for seamless document collaboration',
      priority: 'medium'
    });
  }
  
  // Analyze customer relationships for Dynamics 365
  if (canvas.customerRelationships.content.some(rel => 
    rel.toLowerCase().includes('crm') || 
    rel.toLowerCase().includes('sales') ||
    rel.toLowerCase().includes('support') ||
    rel.toLowerCase().includes('service')
  )) {
    recommendations.push({
      service: 'Dynamics 365',
      category: 'Customer Relationship Management',
      recommendation: 'Implement Dynamics 365 Sales and Customer Service for comprehensive CRM solution',
      priority: 'high'
    });
  }
  
  // Always recommend Azure for hosting
  recommendations.push({
    service: 'Azure App Service',
    category: 'Cloud Infrastructure',
    recommendation: 'Host your application on Azure for scalability, security, and global reach',
    priority: 'high'
  });
  
  return recommendations;
}

/**
 * Generate detailed technology stack recommendations
 */
function generateTechnologyRecommendations(canvas: BusinessModelCanvas) {
  return {
    frontend: [
      {
        technology: 'React with TypeScript',
        reason: 'Type safety and component reusability',
        microsoftIntegration: 'Works seamlessly with Microsoft Graph Toolkit'
      },
      {
        technology: 'Babylon.js',
        reason: 'Microsoft-owned 3D engine for immersive experiences',
        microsoftIntegration: 'Native Microsoft technology with excellent Azure integration'
      }
    ],
    backend: [
      {
        technology: 'Azure App Service',
        reason: 'Managed hosting with auto-scaling and security',
        microsoftIntegration: 'Native Azure service with built-in monitoring'
      },
      {
        technology: 'Azure Database for PostgreSQL',
        reason: 'Fully managed database with high availability',
        microsoftIntegration: 'Integrated with Azure security and backup services'
      }
    ],
    ai: [
      {
        technology: 'Azure OpenAI Service',
        reason: 'Enterprise-grade AI with data privacy guarantees',
        microsoftIntegration: 'Seamless integration with Microsoft ecosystem'
      },
      {
        technology: 'Microsoft Copilot',
        reason: 'Context-aware business intelligence and automation',
        microsoftIntegration: 'Deep integration with Microsoft 365 and organizational data'
      }
    ],
    productivity: [
      {
        technology: 'Microsoft Graph API',
        reason: 'Access to Microsoft 365 data and insights',
        microsoftIntegration: 'Core Microsoft service for unified data access'
      },
      {
        technology: 'Power Platform',
        reason: 'Low-code solutions for business process automation',
        microsoftIntegration: 'Native Microsoft platform with extensive connectors'
      }
    ]
  };
}

export default router;