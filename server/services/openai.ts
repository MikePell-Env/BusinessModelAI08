import OpenAI from "openai";
import { BusinessModelCanvas, CanvasUpdateRequest } from "../../client/src/types/canvas";
import { processCopilotChat, analyzeCopilotCanvas } from './microsoftCopilot';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "your-openai-api-key-here"
});

interface ChatRequest {
  message: string;
  canvas: BusinessModelCanvas;
  chatHistory: Array<{ role: string; content: string }>;
}

interface ChatResponse {
  response: string;
  canvasUpdates?: Partial<BusinessModelCanvas>;
}

export async function processAIChat(request: ChatRequest): Promise<ChatResponse> {
  // Skip Microsoft Copilot for now and go directly to OpenAI for reliable responses
  console.log('Processing chat request with OpenAI for:', request.message);
  
  // Check if OpenAI API key is available
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your-openai-api-key-here") {
    console.log('OpenAI API key not configured, using simple fallback');
    return generateFallbackResponse(request);
  }
  
  try {
    return await processOpenAIChat(request);
  } catch (error) {
    console.log('OpenAI request failed, using fallback response:', error.message);
    return generateFallbackResponse(request);
  }
}

function generateFallbackResponse(request: ChatRequest): ChatResponse {
  const { message, canvas } = request;
  const lowerMessage = message.toLowerCase();
  
  let response = `I understand you're asking about "${message}". Based on your ${canvas.name} business model, here are some insights:\n\n`;
  
  if (lowerMessage.includes('market') || lowerMessage.includes('opportunity') || lowerMessage.includes('opportunities')) {
    response += `For market opportunities, consider:
- Expanding to new customer segments beyond ${canvas.customerSegments.content.join(', ')}
- Leveraging your key resources (${canvas.keyResources.content.join(', ')}) in new markets
- Exploring partnerships that complement your value propositions: ${canvas.valuePropositions.content.join(', ')}
- Digital transformation opportunities in your channels: ${canvas.channels.content.join(', ')}

Your current revenue streams (${canvas.revenueStreams.content.join(', ')}) could be expanded or diversified to capture these opportunities.`;
  } else if (lowerMessage.includes('value proposition') || lowerMessage.includes('value')) {
    response += `Your value propositions focus on: ${canvas.valuePropositions.content.join(', ')}. Consider how these create unique value for your customers and differentiate you from competitors.`;
  } else if (lowerMessage.includes('customer') || lowerMessage.includes('segment')) {
    response += `Your customer segments include: ${canvas.customerSegments.content.join(', ')}. Think about how to better serve these specific groups and identify potential new segments.`;
  } else if (lowerMessage.includes('revenue') || lowerMessage.includes('money') || lowerMessage.includes('income')) {
    response += `Your revenue streams are: ${canvas.revenueStreams.content.join(', ')}. Consider diversifying or optimizing these income sources for better financial stability.`;
  } else if (lowerMessage.includes('cost') || lowerMessage.includes('expense')) {
    response += `Your cost structure includes: ${canvas.costStructure.content.join(', ')}. Look for ways to optimize and reduce unnecessary expenses while maintaining quality.`;
  } else if (lowerMessage.includes('partner') || lowerMessage.includes('partnership')) {
    response += `Your key partners are: ${canvas.keyPartners.content.join(', ')}. Consider how to strengthen these relationships and identify new strategic partnerships.`;
  } else {
    response += `I can help you analyze different aspects of your business model. Feel free to ask about:
- Value propositions and how they serve your customers
- Customer segments and market opportunities
- Revenue streams and financial optimization
- Cost structure and operational efficiency
- Strategic partnerships and key resources`;
  }
  
  response += `\n\nWould you like me to elaborate on any of these suggestions?`;
  
  return { response };
}

async function processOpenAIChat(request: ChatRequest): Promise<ChatResponse> {
  try {
    const { message, canvas, chatHistory } = request;

    // Build context about the current canvas
    const canvasContext = `
Current Business Model Canvas:
- Name: ${canvas.name}
- Description: ${canvas.description}

Canvas Elements:
- Key Partners: ${canvas.keyPartners.content.join(', ')}
- Key Activities: ${canvas.keyActivities.content.join(', ')}
- Key Resources: ${canvas.keyResources.content.join(', ')}
- Value Propositions: ${canvas.valuePropositions.content.join(', ')}
- Customer Relationships: ${canvas.customerRelationships.content.join(', ')}
- Channels: ${canvas.channels.content.join(', ')}
- Customer Segments: ${canvas.customerSegments.content.join(', ')}
- Cost Structure: ${canvas.costStructure.content.join(', ')}
- Revenue Streams: ${canvas.revenueStreams.content.join(', ')}
`;

    const systemPrompt = `You are an expert business model advisor specializing in business model canvas analysis and optimization. You help users understand, analyze, and improve their business models.

Context: ${canvasContext}

Your capabilities:
1. Explain any part of the business model canvas
2. Suggest improvements and optimizations
3. Identify potential risks or opportunities
4. Help with strategic planning
5. Answer questions about business model theory and best practices

When users ask for changes to the canvas, respond with both:
1. A conversational explanation of the suggestion
2. If applicable, specific updates to apply to the canvas

Always be helpful, insightful, and provide actionable advice. Focus on practical business value.`;

    // Prepare messages for the API call
    const messages = [
      { role: "system", content: systemPrompt },
      ...chatHistory.slice(-10), // Include last 10 messages for context
      { role: "user", content: message }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const aiResponse = response.choices[0].message.content || "I'm sorry, I couldn't generate a response.";

    // Check if the AI suggests specific updates to the canvas
    let canvasUpdates: Partial<BusinessModelCanvas> | undefined;

    // Simple pattern matching for common update scenarios
    if (message.toLowerCase().includes('update') || 
        message.toLowerCase().includes('change') || 
        message.toLowerCase().includes('add') ||
        message.toLowerCase().includes('remove')) {
      
      // For now, we'll let the AI suggest changes through conversation
      // In a more advanced implementation, we could parse the AI response
      // for structured updates using JSON output format
    }

    return {
      response: aiResponse,
      canvasUpdates
    };

  } catch (error) {
    console.error('Error processing AI chat:', error);
    
    // Don't throw error here, let the upper level function handle it
    throw error;
  }
}

export async function analyzeCanvas(canvas: BusinessModelCanvas): Promise<{
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  recommendations: string[];
}> {
  // First try Microsoft Copilot API
  try {
    const copilotAnalysis = await analyzeCopilotCanvas(canvas);
    return {
      strengths: copilotAnalysis.insights,
      weaknesses: copilotAnalysis.risks,
      opportunities: copilotAnalysis.suggestions,
      threats: copilotAnalysis.risks,
      recommendations: copilotAnalysis.suggestions
    };
  } catch (copilotError) {
    console.log('Microsoft Copilot analysis not available, falling back to OpenAI:', copilotError.message);
    
    // Fallback to OpenAI analysis
    return await analyzeCanvasWithOpenAI(canvas);
  }
}

async function analyzeCanvasWithOpenAI(canvas: BusinessModelCanvas): Promise<{
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  recommendations: string[];
}> {
  try {
    const prompt = `Analyze this business model canvas and provide a SWOT analysis plus recommendations:

Business Model: ${canvas.name}
Description: ${canvas.description}

Key Partners: ${canvas.keyPartners.content.join(', ')}
Key Activities: ${canvas.keyActivities.content.join(', ')}
Key Resources: ${canvas.keyResources.content.join(', ')}
Value Propositions: ${canvas.valuePropositions.content.join(', ')}
Customer Relationships: ${canvas.customerRelationships.content.join(', ')}
Channels: ${canvas.channels.content.join(', ')}
Customer Segments: ${canvas.customerSegments.content.join(', ')}
Cost Structure: ${canvas.costStructure.content.join(', ')}
Revenue Streams: ${canvas.revenueStreams.content.join(', ')}

Please respond with a JSON object containing:
{
  "strengths": ["strength 1", "strength 2", ...],
  "weaknesses": ["weakness 1", "weakness 2", ...],
  "opportunities": ["opportunity 1", "opportunity 2", ...],
  "threats": ["threat 1", "threat 2", ...],
  "recommendations": ["recommendation 1", "recommendation 2", ...]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a business strategy expert. Analyze business models and provide structured SWOT analysis and recommendations in JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      opportunities: result.opportunities || [],
      threats: result.threats || [],
      recommendations: result.recommendations || []
    };

  } catch (error) {
    console.error('Error analyzing canvas:', error);
    throw new Error('Failed to analyze canvas');
  }
}
