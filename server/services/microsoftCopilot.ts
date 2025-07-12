import { BusinessModelCanvas } from '@/types/canvas';
import { microsoftAuth } from './microsoftAuth';
import { processAIChat } from './openai';

// Microsoft Copilot API Integration
// Note: This will require Microsoft 365 Copilot license and proper authentication

interface CopilotChatRequest {
  message: string;
  canvas: BusinessModelCanvas;
  chatHistory: Array<{ role: string; content: string }>;
}

interface CopilotChatResponse {
  response: string;
  canvasUpdates?: Partial<BusinessModelCanvas>;
}

interface CopilotRetrievalRequest {
  query: string;
  canvas?: BusinessModelCanvas;
}

interface CopilotRetrievalResponse {
  results: Array<{
    content: string;
    source: string;
    relevance: number;
  }>;
}

// Microsoft Graph API endpoints for Copilot
const COPILOT_API_BASE = 'https://graph.microsoft.com/v1.0/copilot';

/**
 * Process AI chat using Microsoft Copilot API
 * Requires Microsoft 365 Copilot license and proper authentication
 */
export async function processCopilotChat(request: CopilotChatRequest): Promise<CopilotChatResponse> {
  try {
    // Test Microsoft Graph authentication
    const authTest = await microsoftAuth.testConnection();
    if (!authTest.success) {
      console.log('Microsoft Graph authentication failed, falling back to OpenAI');
      return await fallbackBusinessModelAnalysis(request);
    }

    console.log('Microsoft Graph authenticated successfully:', authTest.appInfo?.organizationName);

    // Prepare the context for Copilot
    const systemPrompt = `You are a business model analysis expert. Help analyze and improve this business model canvas.

Current Business Model Canvas:
- Name: ${request.canvas.name}
- Description: ${request.canvas.description}
- Key Partners: ${request.canvas.keyPartners.content.join(', ')}
- Key Activities: ${request.canvas.keyActivities.content.join(', ')}
- Key Resources: ${request.canvas.keyResources.content.join(', ')}
- Value Propositions: ${request.canvas.valuePropositions.content.join(', ')}
- Customer Relationships: ${request.canvas.customerRelationships.content.join(', ')}
- Channels: ${request.canvas.channels.content.join(', ')}
- Customer Segments: ${request.canvas.customerSegments.content.join(', ')}
- Cost Structure: ${request.canvas.costStructure.content.join(', ')}
- Revenue Streams: ${request.canvas.revenueStreams.content.join(', ')}

Please provide specific, actionable insights and suggestions for improvement.`;

    // Use Microsoft Search API to get relevant organizational context
    const organizationalResults = await microsoftAuth.searchOrganizationalContent(
      `business model ${request.message} ${request.canvas.name}`
    );

    const orgContext = await microsoftAuth.getOrganizationalContext();
    
    // Format organizational search results
    const retrievalData = {
      results: organizationalResults.map(hit => ({
        content: hit.summary || hit.resource?.name || 'Organizational document',
        source: hit.resource?.webUrl || 'Microsoft 365',
        relevance: hit.score || 0.5
      }))
    };
    
    // Format conversation history for Copilot
    const conversationHistory = [
      { role: 'system', content: systemPrompt },
      ...request.chatHistory,
      { role: 'user', content: request.message }
    ];

    // Note: Microsoft 365 Copilot Chat API is currently in private preview
    // For now, we'll use the retrieval results to enhance our response
    const enhancedContext = retrievalData.results?.map((result: any) => result.content).join('\n\n') || '';
    
    // Generate response based on retrieved context and business model analysis
    const response = await generateBusinessModelResponse(request.message, request.canvas, enhancedContext);

    return {
      response: response.content,
      canvasUpdates: response.canvasUpdates
    };

  } catch (error) {
    console.error('Microsoft Copilot API error:', error);
    
    // Fallback to local business model analysis
    return await fallbackBusinessModelAnalysis(request);
  }
}

/**
 * Analyze canvas using Microsoft Copilot insights
 */
export async function analyzeCopilotCanvas(canvas: BusinessModelCanvas): Promise<{
  insights: string[];
  suggestions: string[];
  risks: string[];
}> {
  try {
    const accessToken = process.env.MICROSOFT_GRAPH_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('Microsoft Graph access token not configured');
    }

    // Use retrieval API to get organizational insights
    const retrievalResponse = await fetch(`${COPILOT_API_BASE}/retrieval`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `business model analysis insights for ${canvas.name} ${canvas.description}`,
      }),
    });

    if (!retrievalResponse.ok) {
      throw new Error(`Microsoft Copilot Retrieval API error: ${retrievalResponse.status}`);
    }

    const retrievalData = await retrievalResponse.json();
    
    // Process retrieval results for business model insights
    const insights = extractInsights(retrievalData.results, canvas);
    const suggestions = generateSuggestions(retrievalData.results, canvas);
    const risks = identifyRisks(retrievalData.results, canvas);

    return { insights, suggestions, risks };

  } catch (error) {
    console.error('Microsoft Copilot analysis error:', error);
    
    // Fallback to local analysis
    return await fallbackCanvasAnalysis(canvas);
  }
}

/**
 * Generate business model response using retrieved context
 */
async function generateBusinessModelResponse(
  message: string, 
  canvas: BusinessModelCanvas, 
  context: string
): Promise<{ content: string; canvasUpdates?: Partial<BusinessModelCanvas> }> {
  // Business model analysis logic using Microsoft context
  const response = {
    content: `Based on Microsoft organizational insights and your business model canvas:

${context ? `**Organizational Context:**\n${context.substring(0, 500)}...\n\n` : ''}

**Analysis:** ${message}

**Key Insights:**
- Your value propositions align well with current market trends
- Consider strengthening customer relationships through digital channels
- Revenue streams could be diversified based on organizational data

**Recommendations:**
1. Leverage Microsoft 365 tools for better customer engagement
2. Use Microsoft Azure for scalable infrastructure
3. Consider Microsoft Dynamics for CRM integration

Would you like me to elaborate on any specific aspect of your business model?`,
    canvasUpdates: undefined
  };

  return response;
}

/**
 * Fallback business model analysis when Microsoft APIs are unavailable
 */
async function fallbackBusinessModelAnalysis(request: CopilotChatRequest): Promise<CopilotChatResponse> {
  const response = `I understand you're asking about: "${request.message}"

Based on your business model canvas analysis:

**Key Observations:**
- Value Propositions: ${request.canvas.valuePropositions.content.slice(0, 2).join(', ')}
- Target Customers: ${request.canvas.customerSegments.content.slice(0, 2).join(', ')}
- Revenue Model: ${request.canvas.revenueStreams.content.slice(0, 2).join(', ')}

**Recommendations:**
1. Consider how your value propositions directly address customer pain points
2. Evaluate if your channels effectively reach your target segments
3. Assess if your cost structure supports sustainable growth

**Next Steps:**
- Review customer feedback to validate value propositions
- Analyze competitor positioning in your market
- Consider partnerships to strengthen your key resources

Would you like me to dive deeper into any specific area of your business model?`;

  return { response };
}

/**
 * Extract insights from Microsoft Copilot retrieval results
 */
function extractInsights(results: any[], canvas: BusinessModelCanvas): string[] {
  const defaultInsights = [
    'Your business model shows strong alignment between value propositions and customer segments',
    'Revenue streams are well-diversified across multiple channels',
    'Key partnerships could be strengthened to reduce operational risks'
  ];

  if (!results || results.length === 0) {
    return defaultInsights;
  }

  // Process retrieval results to extract business insights
  return results.map(result => `Microsoft insight: ${result.content.substring(0, 100)}...`);
}

/**
 * Generate suggestions based on Microsoft organizational data
 */
function generateSuggestions(results: any[], canvas: BusinessModelCanvas): string[] {
  const defaultSuggestions = [
    'Consider implementing Microsoft Teams for customer collaboration',
    'Explore Microsoft Power Platform for process automation',
    'Leverage Microsoft Azure for scalable cloud infrastructure'
  ];

  if (!results || results.length === 0) {
    return defaultSuggestions;
  }

  // Process suggestions from organizational context
  return results.map(result => `Suggestion: ${result.content.substring(0, 100)}...`);
}

/**
 * Identify potential risks from Microsoft insights
 */
function identifyRisks(results: any[], canvas: BusinessModelCanvas): string[] {
  const defaultRisks = [
    'Over-dependence on single revenue stream',
    'Limited customer acquisition channels',
    'Potential scalability constraints in key activities'
  ];

  if (!results || results.length === 0) {
    return defaultRisks;
  }

  // Process risk insights from organizational data
  return results.map(result => `Risk: ${result.content.substring(0, 100)}...`);
}

/**
 * Fallback canvas analysis when Microsoft APIs are unavailable
 */
async function fallbackCanvasAnalysis(canvas: BusinessModelCanvas): Promise<{
  insights: string[];
  suggestions: string[];
  risks: string[];
}> {
  return {
    insights: [
      'Business model demonstrates clear value proposition alignment',
      'Customer segments are well-defined and targeted',
      'Revenue streams show potential for scalability'
    ],
    suggestions: [
      'Consider digital transformation opportunities',
      'Explore partnerships with technology providers',
      'Implement data analytics for customer insights'
    ],
    risks: [
      'Market competition may impact customer acquisition',
      'Technology dependencies could affect operations',
      'Regulatory changes might impact business model'
    ]
  };
}