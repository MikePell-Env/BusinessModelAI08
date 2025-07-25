import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { processAIChat, analyzeCanvas } from "./services/openai";
import { processCopilotChat, analyzeCopilotCanvas } from "./services/microsoftCopilot";
import { microsoftAuth } from "./services/microsoftAuth";
import { BusinessModelCanvas } from "../client/src/types/canvas";
import copilotRoutes from "./routes/copilot";

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount Microsoft Copilot routes
  app.use('/api/copilot', copilotRoutes);
  // AI Chat endpoint (Microsoft Copilot with OpenAI fallback)
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, canvas, chatHistory } = req.body;
      
      if (!message || !canvas) {
        return res.status(400).json({ 
          error: "Missing required fields: message and canvas" 
        });
      }

      console.log('🤖 Processing chat request with Microsoft Copilot...');
      // Use Microsoft Copilot service with Azure OpenAI fallback
      const response = await processCopilotChat({
        message,
        canvas,
        chatHistory: chatHistory || []
      });
      
      // Add service identification info to response
      const responseWithServiceInfo = {
        ...response,
        serviceInfo: {
          provider: 'Microsoft Copilot',
          route: 'Azure OpenAI → Microsoft Graph → OpenAI Fallback',
          timestamp: new Date().toISOString()
        }
      };
      
      console.log('✅ Chat response generated via Microsoft technology stack');
      res.json(responseWithServiceInfo);
    } catch (error) {
      console.error("Error in AI chat:", error);
      res.status(500).json({ 
        error: "Failed to process AI request",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Canvas analysis endpoint
  app.post("/api/ai/analyze", async (req, res) => {
    try {
      const { canvas } = req.body;
      
      if (!canvas) {
        return res.status(400).json({ 
          error: "Missing required field: canvas" 
        });
      }

      const analysis = await analyzeCanvas(canvas as BusinessModelCanvas);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing canvas:", error);
      res.status(500).json({ 
        error: "Failed to analyze canvas",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Test Microsoft Copilot API connection
  app.post("/api/test-copilot", async (req, res) => {
    try {
      // Test the Microsoft Graph authentication and connection
      const connectionResult = await microsoftAuth.testConnection();
      
      if (connectionResult.success) {
        res.json({
          success: true,
          message: 'Microsoft Graph connection successful',
          appInfo: connectionResult.appInfo,
          configured: true
        });
      } else {
        res.json({
          success: false,
          message: connectionResult.message,
          configured: false
        });
      }
    } catch (error) {
      console.error('Microsoft Copilot test error:', error);
      res.json({
        success: false,
        message: 'Failed to test Microsoft Copilot connection: ' + (error instanceof Error ? error.message : 'Unknown error'),
        configured: false
      });
    }
  });

  // Canvas CRUD endpoints
  app.get("/api/canvas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      // For now, return mock data or implement storage retrieval
      res.json({ message: `Canvas ${id} requested` });
    } catch (error) {
      console.error("Error fetching canvas:", error);
      res.status(500).json({ error: "Failed to fetch canvas" });
    }
  });

  app.post("/api/canvas", async (req, res) => {
    try {
      const canvas = req.body;
      // Implement canvas storage
      res.json({ message: "Canvas saved", id: canvas.id });
    } catch (error) {
      console.error("Error saving canvas:", error);
      res.status(500).json({ error: "Failed to save canvas" });
    }
  });

  app.put("/api/canvas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      // Implement canvas update
      res.json({ message: `Canvas ${id} updated` });
    } catch (error) {
      console.error("Error updating canvas:", error);
      res.status(500).json({ error: "Failed to update canvas" });
    }
  });

  // PowerPoint import endpoint
  app.post("/api/import/powerpoint", async (req, res) => {
    try {
      const { fileId, siteId, method } = req.body;
      
      if (method === 'graph' && fileId) {
        const { powerpointImporter } = await import('./services/powerpointImporter');
        const canvas = await powerpointImporter.importFromGraphAPI(fileId, siteId);
        res.json({ success: true, canvas });
      } else if (method === 'upload') {
        // Handle file upload (would need multipart parsing)
        res.status(400).json({ error: 'File upload method not implemented yet' });
      } else {
        res.status(400).json({ error: 'Invalid import method or missing fileId' });
      }
    } catch (error) {
      console.error('PowerPoint import error:', error);
      res.status(500).json({ 
        error: 'Failed to import PowerPoint file',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get PowerPoint template instructions
  app.get("/api/import/powerpoint/template", async (_req, res) => {
    try {
      const { PowerPointImporter } = await import('./services/powerpointImporter');
      const instructions = PowerPointImporter.getTemplateInstructions();
      res.json({ success: true, instructions });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get template instructions' });
    }
  });

  // Test PowerPoint import with sample data
  app.post("/api/import/powerpoint/test", async (req, res) => {
    try {
      const { powerpointImporter } = await import('./services/powerpointImporter');
      
      // Simulate sample PowerPoint content for testing
      const sampleContent = `TechCorp AI Platform - Business Model Canvas
      
Key Partners
• Microsoft Azure (Cloud infrastructure)
• OpenAI (AI model licensing)
• Salesforce (CRM integration)
• Stripe (Payment processing)
• Industry consultants

Key Activities
• AI algorithm development
• Software engineering
• Customer onboarding
• Data analytics
• Technical support

Key Resources
• Proprietary AI algorithms
• Development team
• Customer data
• Cloud infrastructure
• Intellectual property

Value Propositions
• Automated business insights
• 50% faster decision making
• Cost reduction through AI
• Real-time analytics
• Scalable enterprise solution

Customer Relationships
• Dedicated account managers
• 24/7 technical support
• Online self-service portal
• Monthly business reviews
• Training programs

Channels
• Direct enterprise sales
• Partner reseller network
• Online SaaS platform
• Industry conferences
• Digital marketing

Customer Segments
• Fortune 500 companies
• Mid-market enterprises
• Healthcare organizations
• Financial services
• Manufacturing companies

Cost Structure
• Cloud hosting costs
• Engineering salaries
• Sales team expenses
• Marketing campaigns
• Legal and compliance

Revenue Streams
• Monthly SaaS subscriptions
• Enterprise licensing fees
• Professional services
• Training and certification
• API usage fees`;

      // Parse the sample content directly
      const canvas = powerpointImporter.parseTestContent(sampleContent);
      res.json({ success: true, canvas });
    } catch (error) {
      console.error('Test import error:', error);
      res.status(500).json({ 
        error: 'Failed to test PowerPoint import',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Azure OpenAI setup endpoints
  app.post("/api/azure/configure", async (req, res) => {
    try {
      const { apiKey, endpoint } = req.body;

      console.log('Received credentials:');
      console.log('- Endpoint:', endpoint);
      console.log('- API Key length:', apiKey?.length);

      if (!apiKey || !endpoint) {
        return res.status(400).json({ 
          error: 'Both API key and endpoint are required' 
        });
      }

      // Validate endpoint format (supports Azure OpenAI, Cognitive Services, and AI Foundry endpoints)
      if (!endpoint.includes('openai.azure.com') && 
          !endpoint.includes('cognitiveservices.azure.com') && 
          !endpoint.includes('inference.ai.azure.com')) {
        return res.status(400).json({ 
          error: 'Invalid Azure endpoint. Should contain "openai.azure.com", "cognitiveservices.azure.com", or "inference.ai.azure.com"' 
        });
      }

      // Ensure endpoint ends with /
      const normalizedEndpoint = endpoint.endsWith('/') ? endpoint : endpoint + '/';

      // Determine API format based on endpoint type
      let testUrl;
      let deploymentName = 'gpt-4';
      const apiVersion = '2025-01-01-preview'; // Use the API version from user's working URL

      if (normalizedEndpoint.includes('inference.ai.azure.com')) {
        // Azure AI Foundry format - direct inference endpoint
        testUrl = `${normalizedEndpoint}v1/chat/completions`;
        console.log('Using Azure AI Foundry format');
      } else {
        // Traditional Azure OpenAI format
        try {
          const deploymentsResponse = await fetch(`${normalizedEndpoint}openai/deployments?api-version=${apiVersion}`, {
            method: 'GET',
            headers: {
              'api-key': apiKey,
            },
          });

          if (deploymentsResponse.ok) {
            const deployments = await deploymentsResponse.json();
            console.log('Available deployments:', deployments);
            
            const gpt4Deployment = deployments.data?.find((d: any) => 
              d.model?.includes('gpt-4') || d.id?.includes('gpt-4')
            );
            
            if (gpt4Deployment) {
              deploymentName = gpt4Deployment.id;
              console.log('Found GPT-4 deployment:', deploymentName);
            }
          }
        } catch (deploymentError) {
          console.log('Could not fetch deployments, using default name:', deploymentError);
        }
        
        testUrl = `${normalizedEndpoint}openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
        console.log('Using Azure OpenAI format with API version:', apiVersion);
      }

      console.log('Testing with URL:', testUrl);

      // Test the credentials by making a simple API call
      const testResponse = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Test connection' }],
          max_tokens: 10
        }),
      });

      console.log('Test response status:', testResponse.status);
      console.log('Test response headers:', Object.fromEntries(testResponse.headers.entries()));

      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        console.log('Full error response:', errorText);
        
        // Parse specific error details
        let errorMessage = `Connection failed (${testResponse.status})`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.message) {
            errorMessage += `: ${errorData.error.message}`;
          }
        } catch {
          errorMessage += `: ${errorText.substring(0, 100)}`;
        }
        
        return res.status(400).json({ 
          error: errorMessage + '\n\nYou need to deploy GPT-4 in Azure Portal (not Azure AI Foundry):\n1. Go to Azure Portal → Your Resource → "Model deployments"\n2. Click "Create new deployment"\n3. Select "gpt-4" model\n4. Name it "gpt-4"\n5. Then try connecting again'
        });
      }

      // Store credentials persistently
      const { saveCredentials } = await import('./utils/credentialStorage');
      await saveCredentials(apiKey, normalizedEndpoint);

      res.json({ 
        success: true, 
        message: 'Azure OpenAI credentials configured successfully. Microsoft Copilot is now active!' 
      });

    } catch (error) {
      console.error('Azure configuration error:', error);
      res.status(500).json({ 
        error: 'Failed to configure Azure OpenAI. Please check your credentials and try again.' 
      });
    }
  });

  app.get("/api/azure/status", async (_req, res) => {
    try {
      const apiKey = process.env.AZURE_OPENAI_API_KEY;
      const endpoint = process.env.AZURE_OPENAI_ENDPOINT;

      if (!apiKey || !endpoint) {
        return res.json({ 
          configured: false,
          message: 'Azure OpenAI credentials not configured' 
        });
      }

      // Test connection
      const testResponse = await fetch(`${endpoint}/openai/deployments/gpt-4/chat/completions?api-version=2025-01-01-preview`, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Status check' }],
          max_tokens: 5
        }),
      });

      res.json({ 
        configured: true,
        connected: testResponse.ok,
        message: testResponse.ok ? 'Microsoft Copilot active' : 'Connection issue detected'
      });

    } catch (error) {
      res.json({ 
        configured: true,
        connected: false,
        message: 'Connection test failed'
      });
    }
  });

  app.delete("/api/azure/credentials", async (_req, res) => {
    try {
      const { clearCredentials } = await import('./utils/credentialStorage');
      await clearCredentials();
      
      res.json({ 
        success: true, 
        message: 'Azure credentials cleared successfully' 
      });
    } catch (error) {
      console.error('Failed to clear credentials:', error);
      res.status(500).json({ 
        error: 'Failed to clear credentials' 
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      version: "1.0.0"
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
