import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { processAIChat, analyzeCanvas } from "./services/openai";
import { BusinessModelCanvas } from "../client/src/types/canvas";

export async function registerRoutes(app: Express): Promise<Server> {
  // AI Chat endpoint
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, canvas, chatHistory } = req.body;
      
      if (!message || !canvas) {
        return res.status(400).json({ 
          error: "Missing required fields: message and canvas" 
        });
      }

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
