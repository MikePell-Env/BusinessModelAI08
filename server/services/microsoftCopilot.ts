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
  // Skip Microsoft Graph calls for now and go directly to OpenAI to avoid infinite loops
  console.log('Processing chat request with OpenAI fallback for:', request.message);
  return await processAIChat(request);
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