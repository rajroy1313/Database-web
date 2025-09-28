import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConnectionSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Connection management routes
  app.get("/api/connections", async (req, res) => {
    try {
      const connections = await storage.getConnections();
      res.json(connections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch connections" });
    }
  });

  app.post("/api/connections", async (req, res) => {
    try {
      const connectionData = insertConnectionSchema.parse(req.body);
      const connection = await storage.createConnection(connectionData);
      res.json(connection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid connection data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create connection" });
      }
    }
  });

  app.post("/api/connections/test", async (req, res) => {
    try {
      const connectionData = insertConnectionSchema.parse(req.body);
      const isValid = await storage.testConnection(connectionData);
      res.json({ success: isValid });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid connection data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to test connection" });
      }
    }
  });

  app.put("/api/connections/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const connectionData = insertConnectionSchema.partial().parse(req.body);
      const connection = await storage.updateConnection(id, connectionData);
      res.json(connection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid connection data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update connection" });
      }
    }
  });

  app.delete("/api/connections/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteConnection(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete connection" });
    }
  });

  // Database operations routes
  app.get("/api/connections/:id/databases", async (req, res) => {
    try {
      const { id } = req.params;
      const databases = await storage.getDatabases(id);
      res.json(databases);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch databases" });
    }
  });

  app.get("/api/connections/:id/databases/:database/tables", async (req, res) => {
    try {
      const { id, database } = req.params;
      const tables = await storage.getTables(id, database);
      res.json(tables);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tables" });
    }
  });

  app.get("/api/connections/:id/databases/:database/tables/:table/structure", async (req, res) => {
    try {
      const { id, database, table } = req.params;
      const columns = await storage.getTableColumns(id, database, table);
      res.json(columns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch table structure" });
    }
  });

  app.get("/api/connections/:id/databases/:database/tables/:table/data", async (req, res) => {
    try {
      const { id, database, table } = req.params;
      const { offset = 0, limit = 25, ...filters } = req.query;
      
      const result = await storage.getTableData(
        id, 
        database, 
        table, 
        parseInt(offset as string), 
        parseInt(limit as string),
        filters
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch table data" });
    }
  });

  app.get("/api/connections/:id/databases/:database/tables/:table/export", async (req, res) => {
    try {
      const { id, database, table } = req.params;
      const { format = 'csv' } = req.query;
      
      const data = await storage.exportTableData(id, database, table, format as 'csv' | 'json');
      
      const contentType = format === 'json' ? 'application/json' : 'text/csv';
      const filename = `${table}.${format}`;
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to export table data" });
    }
  });

  app.post("/api/connections/:id/query", async (req, res) => {
    try {
      const { id } = req.params;
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: "Query is required" });
        return;
      }
      
      const result = await storage.executeQuery(id, query);
      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Query execution failed";
      res.status(500).json({ error: errorMessage });
    }
  });

  app.get("/api/connections/:id/history", async (req, res) => {
    try {
      const { id } = req.params;
      const history = await storage.getQueryHistory(id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch query history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
