import OpenAI from "openai";
import { BusinessModelCanvas, CanvasUpdateRequest } from "../../client/src/types/canvas";

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
    throw new Error('Failed to process AI request');
  }
}

export async function analyzeCanvas(canvas: BusinessModelCanvas): Promise<{
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
