import { apiRequest } from "./queryClient";
import { Connection, InsertConnection, QueryResult, DatabaseTable, TableColumn } from "@shared/schema";

export class DatabaseService {
  static async getConnections(): Promise<Connection[]> {
    const response = await apiRequest("GET", "/api/connections");
    return response.json();
  }

  static async createConnection(connection: InsertConnection): Promise<Connection> {
    const response = await apiRequest("POST", "/api/connections", connection);
    return response.json();
  }

  static async testConnection(connection: InsertConnection): Promise<{ success: boolean }> {
    const response = await apiRequest("POST", "/api/connections/test", connection);
    return response.json();
  }

  static async updateConnection(id: string, connection: Partial<InsertConnection>): Promise<Connection> {
    const response = await apiRequest("PUT", `/api/connections/${id}`, connection);
    return response.json();
  }

  static async deleteConnection(id: string): Promise<void> {
    await apiRequest("DELETE", `/api/connections/${id}`);
  }

  static async getDatabases(connectionId: string): Promise<string[]> {
    const response = await apiRequest("GET", `/api/connections/${connectionId}/databases`);
    return response.json();
  }

  static async getTables(connectionId: string, database: string): Promise<DatabaseTable[]> {
    const response = await apiRequest("GET", `/api/connections/${connectionId}/databases/${database}/tables`);
    return response.json();
  }

  static async getTableStructure(connectionId: string, database: string, table: string): Promise<TableColumn[]> {
    const response = await apiRequest("GET", `/api/connections/${connectionId}/databases/${database}/tables/${table}/structure`);
    return response.json();
  }

  static async getTableData(
    connectionId: string, 
    database: string, 
    table: string, 
    options?: {
      offset?: number;
      limit?: number;
      search?: string;
      column?: string;
      sort?: string;
    }
  ): Promise<QueryResult> {
    const params = new URLSearchParams();
    if (options?.offset) params.append("offset", options.offset.toString());
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.search) params.append("search", options.search);
    if (options?.column) params.append("column", options.column);
    if (options?.sort) params.append("sort", options.sort);

    const url = `/api/connections/${connectionId}/databases/${database}/tables/${table}/data${params.toString() ? `?${params}` : ""}`;
    const response = await apiRequest("GET", url);
    return response.json();
  }

  static async executeQuery(connectionId: string, query: string): Promise<QueryResult> {
    const response = await apiRequest("POST", `/api/connections/${connectionId}/query`, { query });
    return response.json();
  }

  static async exportTableData(connectionId: string, database: string, table: string, format: 'csv' | 'json'): Promise<string> {
    const response = await apiRequest("GET", `/api/connections/${connectionId}/databases/${database}/tables/${table}/export?format=${format}`);
    return response.text();
  }
}
