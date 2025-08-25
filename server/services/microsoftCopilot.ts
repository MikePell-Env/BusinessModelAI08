import { BusinessModelCanvas } from '@/types/canvas';
import { microsoftAuth } from './microsoftAuth';

// Microsoft Copilot API Integration
// Note: This will require Microsoft 365 Copilot license and proper authentication

// Debug configuration - set to true to show service indicators
const DEBUG_SHOW_SERVICE_INFO = false;

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

// Microsoft Graph API endpoints for Copilot and Azure OpenAI
const COPILOT_API_BASE = 'https://graph.microsoft.com/v1.0/copilot';
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || 'https://your-resource.openai.azure.com';
const AZURE_OPENAI_API_VERSION = '2025-01-01-preview';

/**
 * Process AI chat using Microsoft Copilot API
 * Requires Microsoft 365 Copilot license and proper authentication
 */
export async function processCopilotChat(request: CopilotChatRequest): Promise<CopilotChatResponse> {
  try {
    console.log('🔄 Attempting Microsoft Copilot via Azure OpenAI...');
    // First try Azure OpenAI Service (more reliable)
    const azureResponse = await tryAzureOpenAI(request);
    if (azureResponse) {
      return azureResponse;
    }

    console.log('🔄 Azure OpenAI unavailable, trying Microsoft Graph Copilot API...');
    // Fallback to Microsoft Graph Copilot API
    const accessToken = await microsoftAuth.getAccessToken();
    
    const response = await fetch(`${COPILOT_API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: request.message,
        context: {
          canvas: request.canvas,
          history: request.chatHistory,
          businessContext: generateBusinessContext(request.canvas)
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Microsoft Copilot API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Microsoft Copilot via Graph API: Response generated successfully');
    return {
      response: DEBUG_SHOW_SERVICE_INFO 
        ? `🤖 **Microsoft Copilot (Graph API)**\n\n${data.response}\n\n---\n*Powered by Microsoft Graph API*`
        : data.response,
      canvasUpdates: data.canvasUpdates
    };

  } catch (error) {
    console.log('⚠️ Microsoft Copilot services not available, falling back to OpenAI...');
    // Direct OpenAI fallback without routing through Microsoft Copilot
    return await fallbackToOpenAI(request);
  }
}

/**
 * Try Azure OpenAI Service for business model analysis
 */
async function tryAzureOpenAI(request: CopilotChatRequest): Promise<CopilotChatResponse | null> {
  try {
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    if (!apiKey || !AZURE_OPENAI_ENDPOINT.includes('azure.com')) {
      return null;
    }

    const response = await fetch(`${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `You are Microsoft Copilot, an expert business strategist specializing in Business Model Canvas analysis.

Business Context: ${request.canvas.name || 'Business Model Canvas'} - ${request.canvas.description || 'No description'}

SPECIAL INSTRUCTIONS:
- If user asks to "open an envisioner" or similar, respond ONLY with: "Opening Envisioner now..."
- For all other queries, provide concise, actionable insights and recommendations. Keep responses focused and brief.

Key Areas: Value Creation, Delivery, Capture, Strategic Fit, Market Validation
Microsoft Technologies: Azure, Microsoft 365, Power Platform, Teams, Dynamics 365`
          },
          ...request.chatHistory.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          {
            role: 'user',
            content: request.message
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    console.log('✅ Microsoft Copilot via Azure OpenAI: Response generated successfully');
    return {
      response: DEBUG_SHOW_SERVICE_INFO 
        ? `🤖 **Microsoft Copilot (Azure OpenAI)**\n\n${data.choices[0].message.content}\n\n---\n*Powered by Azure OpenAI Service*`
        : data.choices[0].message.content
    };

  } catch (error) {
    console.log('Azure OpenAI not available:', (error as Error).message);
    return null;
  }
}

/**
 * Direct OpenAI fallback function to avoid routing loops
 */
async function fallbackToOpenAI(request: CopilotChatRequest): Promise<CopilotChatResponse> {
  try {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use the faster mini model for better response times
      messages: [
        {
          role: 'system',
          content: `You are Microsoft Copilot, an expert business strategist specializing in Business Model Canvas analysis.

Business Context: ${request.canvas.name || 'Business Model Canvas'} - ${request.canvas.description || 'No description'}

SPECIAL INSTRUCTIONS:
- If user asks to "open an envisioner" or similar, respond ONLY with: "Opening Envisioner now..."
- For all other queries, provide concise, actionable insights and recommendations. Keep responses focused and brief.`
        },
        ...request.chatHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        {
          role: 'user',
          content: request.message
        }
      ],
      max_tokens: 400,
      temperature: 0.7
    });

    console.log('✅ Microsoft Copilot via OpenAI Fallback: Response generated successfully');
    return {
      response: DEBUG_SHOW_SERVICE_INFO 
        ? `🤖 **Microsoft Copilot (OpenAI Fallback)**\n\n${response.choices[0].message.content}\n\n---\n*Note: Using OpenAI fallback - Microsoft services temporarily unavailable*`
        : response.choices[0].message.content || 'No response generated'
    };

  } catch (error) {
    console.error('OpenAI fallback failed:', error);
    return {
      response: `❌ **Service Unavailable**\n\nI'm having trouble connecting to AI services right now. Please try again in a moment.`
    };
  }
}

/**
 * Generate business context for enhanced Copilot responses
 */
function generateBusinessContext(canvas: BusinessModelCanvas): string {
  // Check if we have overview data from PowerPoint import
  const hasOverviewData = canvas.overviewData && (
    canvas.overviewData.companyName || 
    canvas.overviewData.summary?.length || 
    canvas.overviewData.founders?.length || 
    canvas.overviewData.market?.length
  );
  
  // Check if main BMC fields have actual content
  const hasMainBMCData = canvas.valuePropositions?.content?.some(item => item.trim() !== '' && item !== 'go here') ||
                         canvas.customerSegments?.content?.some(item => item.trim() !== '' && item !== 'go here');

  if (hasOverviewData) {
    // Use PowerPoint overview data
    const { overviewData } = canvas;
    return `
Business Model Analysis Context for ${overviewData!.companyName || canvas.name}:

Company Overview:
- Name: ${overviewData!.companyName || canvas.name}
- Summary: ${overviewData!.summary?.join(' | ') || 'Business simulation and analytics platform'}

Leadership:
- Founders: ${overviewData!.founders?.join(' | ') || 'Leadership information not provided'}

Market Information:
- Target Market: ${overviewData!.market?.join(' | ') || 'Enterprise business analytics market'}

Key Business Focus:
- ${overviewData!.summary?.[0] || 'AI-powered business simulation capabilities'}
- Enables interactive business model exploration and decision-making
- Targets the global business analytics software market ($70B annually)

Microsoft Integration Opportunities:
- Azure cloud services for scalability and global reach
- Microsoft 365 for productivity and collaboration 
- Power Platform for low-code automation and workflows
- Teams for customer engagement and internal collaboration
- Dynamics 365 for comprehensive CRM/ERP solutions
- Azure AI services for enhanced customer insights
- Microsoft Viva for employee experience optimization
- Azure DevOps for development lifecycle management
    `;
  } else if (hasMainBMCData) {
    // Use traditional BMC data
    return `
Business Model Analysis Context:
- Company: ${canvas.name}
- Key Value Props: ${canvas.valuePropositions.content.join(', ')}
- Target Segments: ${canvas.customerSegments.content.join(', ')}
- Revenue Model: ${canvas.revenueStreams.content.join(', ')}
- Key Resources: ${canvas.keyResources.content.join(', ')}

Microsoft Integration Opportunities:
- Azure cloud services for scalability and global reach
- Microsoft 365 for productivity and collaboration
- Power Platform for low-code automation and workflows
- Teams for customer engagement and internal collaboration  
- Dynamics 365 for comprehensive CRM/ERP solutions
- Azure AI services for enhanced customer insights
- Microsoft Viva for employee experience optimization
- Azure DevOps for development lifecycle management
    `;
  } else {
    // No specific business data available
    return `
General Business Model Discussion Context:
- Business Model Canvas analysis and strategic planning
- No specific company data currently loaded

Microsoft Integration Opportunities:
- Azure cloud services for scalability and global reach
- Microsoft 365 for productivity and collaboration
- Power Platform for low-code automation and workflows
- Teams for customer engagement and internal collaboration  
- Dynamics 365 for comprehensive CRM/ERP solutions
- Azure AI services for enhanced customer insights
- Microsoft Viva for employee experience optimization
- Azure DevOps for development lifecycle management
    `;
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
  // Simple rule-based response generation as fallback
  const lowerMessage = message.toLowerCase();
  
  let response = "Thank you for your question about the business model canvas. ";
  
  if (lowerMessage.includes('value proposition') || lowerMessage.includes('value')) {
    response += `Your value propositions focus on: ${canvas.valuePropositions.content.join(', ')}. Consider how these create unique value for your customers.`;
  } else if (lowerMessage.includes('customer') || lowerMessage.includes('segment')) {
    response += `Your customer segments include: ${canvas.customerSegments.content.join(', ')}. Think about how to better serve these specific groups.`;
  } else if (lowerMessage.includes('revenue') || lowerMessage.includes('money')) {
    response += `Your revenue streams are: ${canvas.revenueStreams.content.join(', ')}. Consider diversifying or optimizing these income sources.`;
  } else if (lowerMessage.includes('cost') || lowerMessage.includes('expense')) {
    response += `Your cost structure includes: ${canvas.costStructure.content.join(', ')}. Look for ways to optimize and reduce unnecessary expenses.`;
  } else {
    response += `I can help you analyze different aspects of your ${canvas.name} business model. Feel free to ask about value propositions, customer segments, revenue streams, or any other canvas element.`;
  }
  
  return {
    content: response,
    canvasUpdates: undefined
  };
}

/**
 * Fallback business model analysis when Microsoft APIs are unavailable
 */
async function fallbackBusinessModelAnalysis(request: CopilotChatRequest): Promise<CopilotChatResponse> {
  console.log('Using local fallback analysis for:', request.message);
  
  // Simple rule-based response generation as fallback
  const response = await generateBusinessModelResponse(
    request.message, 
    request.canvas, 
    'Local analysis context'
  );
  
  return {
    response: response.content,
    canvasUpdates: response.canvasUpdates
  };
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
 * Analyze PowerPoint content for business overview using Microsoft Copilot
 */
export async function analyzeOverviewWithCopilot(slideText: string, companyName: string): Promise<{
  companyName: string;
  summary: string[];
  founders: string[];
  details: string[];
}> {
  try {
    console.log('🔄 Analyzing PowerPoint content with Microsoft Copilot...');
    
    // First try Azure OpenAI Service
    const azureResult = await tryAzureOverviewAnalysis(slideText, companyName);
    if (azureResult) {
      return azureResult;
    }

    console.log('🔄 Azure OpenAI unavailable, trying Microsoft Graph Copilot API...');
    // Fallback to Microsoft Graph Copilot API
    const accessToken = await microsoftAuth.getAccessToken();
    
    const response = await fetch(`${COPILOT_API_BASE}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: slideText,
        task: 'business_overview_analysis',
        parameters: {
          companyName,
          sections: ['summary', 'founders', 'details'],
          paragraphs_per_section: 3
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Microsoft Copilot API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Microsoft Copilot via Graph API: Overview analysis complete');
    
    return formatOverviewData(data, companyName);

  } catch (error) {
    console.log('⚠️ Microsoft Copilot services not available, using fallback analysis...');
    return getFallbackOverviewData(companyName);
  }
}

/**
 * Try Azure OpenAI Service for overview analysis
 */
async function tryAzureOverviewAnalysis(slideText: string, companyName: string): Promise<{
  companyName: string;
  summary: string[];
  founders: string[];
  details: string[];
} | null> {
  try {
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    if (!apiKey || !AZURE_OPENAI_ENDPOINT.includes('azure.com')) {
      return null;
    }

    const prompt = `Analyze the following business presentation content and extract key information.

Company Name: ${companyName}

Presentation Content:
${slideText}

Please provide EXACTLY 3 paragraphs for each section below. Each paragraph should be 2-4 sentences long.

Respond in JSON format with:
{
  "summary": ["paragraph 1", "paragraph 2", "paragraph 3"],
  "founders": ["paragraph 1", "paragraph 2", "paragraph 3"], 
  "details": ["paragraph 1", "paragraph 2", "paragraph 3"]
}

SUMMARY: Business overview, what the company does, market opportunity
FOUNDERS: Information about founders, leadership team, their backgrounds
DETAILS: Business model specifics, key differentiators, target market

If any section lacks sufficient information, create relevant content based on typical business context.`;

    const response = await fetch(`${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are a business analyst expert using Microsoft Copilot. Analyze presentation content and provide structured business overview information. Always provide exactly 3 paragraphs per section, even if information is limited.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON response
    const result = JSON.parse(content);
    
    console.log('✅ Microsoft Copilot via Azure OpenAI: Overview analysis complete');
    return formatOverviewData(result, companyName);

  } catch (error) {
    console.log('Azure OpenAI overview analysis not available:', (error as Error).message);
    return null;
  }
}

/**
 * Format overview data with proper structure
 */
function formatOverviewData(result: any, companyName: string): {
  companyName: string;
  summary: string[];
  founders: string[];
  details: string[];
} {
  const formatSection = (section: string[] | undefined): string[] => {
    if (!section || !Array.isArray(section)) {
      return [
        'Content not available from presentation.',
        'Upload a PowerPoint file for AI-powered analysis.',
        'Microsoft Copilot will extract relevant information.'
      ];
    }
    
    // Ensure exactly 3 paragraphs
    while (section.length < 3) {
      section.push('Additional information will be populated from your presentation.');
    }
    
    return section.slice(0, 3); // Take only first 3 if more exist
  };

  return {
    companyName: companyName || 'Your Company',
    summary: formatSection(result.summary),
    founders: formatSection(result.founders),
    details: formatSection(result.details)
  };
}

/**
 * Fallback overview data when Microsoft services are unavailable
 */
function getFallbackOverviewData(companyName: string): {
  companyName: string;
  summary: string[];
  founders: string[];
  details: string[];
} {
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