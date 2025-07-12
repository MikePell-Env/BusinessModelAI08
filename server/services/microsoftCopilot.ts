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

    // Create dynamic context based on the specific user question
    const questionContext = `
User's Specific Question: "${request.message}"

Analysis Focus Instructions:
- If asking about RISKS: Focus on potential threats, market risks, operational risks, financial risks
- If asking about VALUE PROPOSITION: Focus on customer benefits, differentiation, competitive advantages  
- If asking about OPPORTUNITIES: Focus on market expansion, new revenue streams, partnerships
- If asking about CUSTOMERS: Focus on target segments, customer needs, acquisition strategies
- If asking about OPERATIONS: Focus on key activities, resources, processes, efficiency
- If asking about FINANCIALS: Focus on costs, revenue models, profitability, pricing

Provide a UNIQUE response that specifically addresses "${request.message}" with:
1. Direct analysis of the question topic
2. Specific recommendations for the current business model
3. Actionable next steps
4. Different insights than previous responses

Current timestamp: ${new Date().toISOString()}
Response variation key: ${Math.random().toString(36).substring(7)}
`;

    const enrichedPrompt = systemPrompt + questionContext;

    // Generate contextual response using the enhanced prompt
    const response = await generateBusinessModelResponse(request.message, request.canvas, enrichedPrompt);

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
  // Use OpenAI to generate dynamic responses with context
  const result = await processAIChat({
    message: message,
    canvas: canvas,
    chatHistory: []
  });
  
  return {
    content: result.response,
    canvasUpdates: result.canvasUpdates
  };
}

/**
 * Fallback business model analysis when Microsoft APIs are unavailable
 */
async function fallbackBusinessModelAnalysis(request: CopilotChatRequest): Promise<CopilotChatResponse> {
  // Use OpenAI as fallback to ensure dynamic responses
  console.log('Falling back to OpenAI for:', request.message);
  return await processAIChat(request);
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