import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSnippetSchema, insertSearchHistorySchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Snippet routes
  app.get("/api/snippets", async (req, res) => {
    try {
      const snippets = await storage.getSnippets();
      res.json(snippets);
    } catch (error) {
      console.error("Error fetching snippets:", error);
      res.status(500).json({ error: "Failed to fetch snippets" });
    }
  });

  app.post("/api/snippets", async (req, res) => {
    try {
      const validatedSnippet = insertSnippetSchema.parse(req.body);
      const newSnippet = await storage.createSnippet(validatedSnippet);
      res.json(newSnippet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid snippet data", details: error.errors });
      } else {
        console.error("Error creating snippet:", error);
        res.status(500).json({ error: "Failed to create snippet" });
      }
    }
  });

  app.put("/api/snippets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedSnippet = insertSnippetSchema.partial().parse(req.body);
      const updatedSnippet = await storage.updateSnippet(id, validatedSnippet);
      res.json(updatedSnippet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid snippet data", details: error.errors });
      } else {
        console.error("Error updating snippet:", error);
        res.status(500).json({ error: "Failed to update snippet" });
      }
    }
  });

  app.delete("/api/snippets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSnippet(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting snippet:", error);
      res.status(500).json({ error: "Failed to delete snippet" });
    }
  });

  app.post("/api/snippets/:id/use", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.updateSnippetUsage(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating snippet usage:", error);
      res.status(500).json({ error: "Failed to update snippet usage" });
    }
  });

  // Search history routes
  app.get("/api/search-history", async (req, res) => {
    try {
      const history = await storage.getSearchHistory();
      res.json(history);
    } catch (error) {
      console.error("Error fetching search history:", error);
      res.status(500).json({ error: "Failed to fetch search history" });
    }
  });

  app.post("/api/search-history", async (req, res) => {
    try {
      const validatedSearch = insertSearchHistorySchema.parse(req.body);
      const newSearch = await storage.addSearchHistory(validatedSearch);
      res.json(newSearch);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid search history data", details: error.errors });
      } else {
        console.error("Error creating search history:", error);
        res.status(500).json({ error: "Failed to create search history" });
      }
    }
  });

  app.put("/api/search-history/:id/score", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { score } = req.body;
      await storage.updateSearchHistoryScore(id, score);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating search history score:", error);
      res.status(500).json({ error: "Failed to update search history score" });
    }
  });

  app.delete("/api/search-history/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSearchHistory(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting search history:", error);
      res.status(500).json({ error: "Failed to delete search history" });
    }
  });

  app.delete("/api/search-history", async (req, res) => {
    try {
      await storage.clearSearchHistory();
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing search history:", error);
      res.status(500).json({ error: "Failed to clear search history" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
