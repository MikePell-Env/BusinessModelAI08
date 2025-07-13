import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { processAIChat, analyzeCanvas } from "./services/openai";
import { processCopilotChat, analyzeCopilotCanvas } from "./services/microsoftCopilot";
import { microsoftAuth } from "./services/microsoftAuth";
import { BusinessModelCanvas } from "../client/src/types/canvas";

export async function registerRoutes(app: Express): Promise<Server> {
  // AI Chat endpoint (Microsoft Copilot with OpenAI fallback)
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, canvas, chatHistory } = req.body;
      
      if (!message || !canvas) {
        return res.status(400).json({ 
          error: "Missing required fields: message and canvas" 
        });
      }

      // Use the OpenAI service which handles fallbacks properly
      const response = await processAIChat({
        message,
        canvas,
        chatHistory: chatHistory || []
      });
      res.json(response);
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
