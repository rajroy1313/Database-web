import { 
  type User, 
  type InsertUser, 
  type Connection, 
  type InsertConnection,
  type QueryHistory,
  type InsertQueryHistory,
  type DatabaseTable,
  type TableColumn,
  type QueryResult,
  users,
  connections,
  queryHistory
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Connection operations
  getConnections(): Promise<Connection[]>;
  getConnection(id: string): Promise<Connection | undefined>;
  createConnection(connection: InsertConnection): Promise<Connection>;
  updateConnection(id: string, connection: Partial<InsertConnection>): Promise<Connection>;
  deleteConnection(id: string): Promise<void>;
  testConnection(connection: InsertConnection): Promise<boolean>;
  
  // Database operations
  getDatabases(connectionId: string): Promise<string[]>;
  getTables(connectionId: string, database: string): Promise<DatabaseTable[]>;
  getTableColumns(connectionId: string, database: string, table: string): Promise<TableColumn[]>;
  getTableData(connectionId: string, database: string, table: string, offset: number, limit: number, filters?: Record<string, any>): Promise<QueryResult>;
  executeQuery(connectionId: string, query: string): Promise<QueryResult>;
  exportTableData(connectionId: string, database: string, table: string, format: 'csv' | 'json'): Promise<string>;
  
  // Query history
  getQueryHistory(connectionId: string): Promise<QueryHistory[]>;
  saveQueryHistory(history: InsertQueryHistory): Promise<QueryHistory>;
}

export class DatabaseStorage implements IStorage {
  private connectionPools: Map<string, Pool> = new Map();

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getConnections(): Promise<Connection[]> {
    return await db.select().from(connections);
  }

  async getConnection(id: string): Promise<Connection | undefined> {
    const [connection] = await db.select().from(connections).where(eq(connections.id, id));
    return connection || undefined;
  }

  async createConnection(connection: InsertConnection): Promise<Connection> {
    const [newConnection] = await db
      .insert(connections)
      .values(connection)
      .returning();
    return newConnection;
  }

  async updateConnection(id: string, connection: Partial<InsertConnection>): Promise<Connection> {
    const [updatedConnection] = await db
      .update(connections)
      .set({ ...connection, updatedAt: new Date() })
      .where(eq(connections.id, id))
      .returning();
    return updatedConnection;
  }

  async deleteConnection(id: string): Promise<void> {
    this.connectionPools.delete(id);
    await db.delete(connections).where(eq(connections.id, id));
  }

  async testConnection(connection: InsertConnection): Promise<boolean> {
    try {
      const pool = new Pool({
        host: connection.host,
        port: connection.port,
        database: connection.database,
        user: connection.username,
        password: connection.password,
        ssl: connection.ssl,
      });
      
      await pool.query('SELECT 1');
      await pool.end();
      return true;
    } catch (error) {
      return false;
    }
  }

  private async getConnectionPool(connectionId: string): Promise<Pool> {
    if (!this.connectionPools.has(connectionId)) {
      const connection = await this.getConnection(connectionId);
      if (!connection) {
        throw new Error('Connection not found');
      }
      
      const pool = new Pool({
        host: connection.host,
        port: connection.port,
        database: connection.database,
        user: connection.username,
        password: connection.password,
        ssl: connection.ssl,
      });
      
      this.connectionPools.set(connectionId, pool);
    }
    
    return this.connectionPools.get(connectionId)!;
  }

  async getDatabases(connectionId: string): Promise<string[]> {
    const pool = await this.getConnectionPool(connectionId);
    const result = await pool.query(
      "SELECT datname FROM pg_database WHERE datistemplate = false"
    );
    return result.rows.map(row => row.datname);
  }

  async getTables(connectionId: string, database: string): Promise<DatabaseTable[]> {
    const pool = await this.getConnectionPool(connectionId);
    const result = await pool.query(`
      SELECT 
        t.table_name as name,
        t.table_schema as schema,
        COALESCE(c.reltuples, 0)::bigint as row_count
      FROM information_schema.tables t
      LEFT JOIN pg_class c ON c.relname = t.table_name
      WHERE t.table_type = 'BASE TABLE' 
      AND t.table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY t.table_name
    `);
    
    return result.rows.map(row => ({
      name: row.name,
      schema: row.schema,
      rowCount: parseInt(row.row_count) || 0,
    }));
  }

  async getTableColumns(connectionId: string, database: string, table: string): Promise<TableColumn[]> {
    const pool = await this.getConnectionPool(connectionId);
    const result = await pool.query(`
      SELECT 
        c.column_name as name,
        c.data_type as type,
        c.is_nullable = 'YES' as nullable,
        c.column_default as default_value,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
        CASE WHEN u.column_name IS NOT NULL THEN true ELSE false END as is_unique,
        COALESCE(c.generation_expression, '') as extra
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
      ) pk ON pk.column_name = c.column_name
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.table_name = $1 AND tc.constraint_type = 'UNIQUE'
      ) u ON u.column_name = c.column_name
      WHERE c.table_name = $1
      ORDER BY c.ordinal_position
    `, [table]);

    return result.rows.map(row => ({
      name: row.name,
      type: row.type,
      nullable: row.nullable,
      defaultValue: row.default_value,
      isPrimaryKey: row.is_primary_key,
      isUnique: row.is_unique,
      extra: row.extra || '',
    }));
  }

  async getTableData(
    connectionId: string, 
    database: string, 
    table: string, 
    offset: number, 
    limit: number,
    filters?: Record<string, any>
  ): Promise<QueryResult> {
    const pool = await this.getConnectionPool(connectionId);
    const startTime = Date.now();
    
    let whereClause = '';
    const values: any[] = [limit, offset];
    let paramCount = 2;
    
    if (filters && Object.keys(filters).length > 0) {
      const conditions = Object.entries(filters)
        .filter(([_, value]) => value !== undefined && value !== '')
        .map(([key, value]) => {
          paramCount++;
          values.push(`%${value}%`);
          return `${key}::text ILIKE $${paramCount}`;
        });
      
      if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }
    }
    
    const query = `SELECT * FROM ${table} ${whereClause} LIMIT $1 OFFSET $2`;
    const result = await pool.query(query, values);
    
    const executionTime = Date.now() - startTime;
    
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0,
      executionTime,
      columns: result.fields?.map(f => f.name) || [],
    };
  }

  async executeQuery(connectionId: string, query: string): Promise<QueryResult> {
    const pool = await this.getConnectionPool(connectionId);
    const startTime = Date.now();
    
    try {
      const result = await pool.query(query);
      const executionTime = Date.now() - startTime;
      
      await this.saveQueryHistory({
        connectionId,
        query,
        executionTime,
        rowsAffected: result.rowCount || 0,
        success: true,
        error: null,
      });
      
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        executionTime,
        columns: result.fields?.map(f => f.name) || [],
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.saveQueryHistory({
        connectionId,
        query,
        executionTime,
        rowsAffected: 0,
        success: false,
        error: errorMessage,
      });
      
      throw error;
    }
  }

  async exportTableData(connectionId: string, database: string, table: string, format: 'csv' | 'json'): Promise<string> {
    const pool = await this.getConnectionPool(connectionId);
    const result = await pool.query(`SELECT * FROM ${table}`);
    
    if (format === 'json') {
      return JSON.stringify(result.rows, null, 2);
    } else {
      if (result.rows.length === 0) return '';
      
      const headers = Object.keys(result.rows[0]);
      const csvRows = [headers.join(',')];
      
      result.rows.forEach(row => {
        const values = headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
            ? `"${stringValue.replace(/"/g, '""')}"`
            : stringValue;
        });
        csvRows.push(values.join(','));
      });
      
      return csvRows.join('\n');
    }
  }

  async getQueryHistory(connectionId: string): Promise<QueryHistory[]> {
    return await db
      .select()
      .from(queryHistory)
      .where(eq(queryHistory.connectionId, connectionId))
      .orderBy(queryHistory.createdAt);
  }

  async saveQueryHistory(history: InsertQueryHistory): Promise<QueryHistory> {
    const [saved] = await db
      .insert(queryHistory)
      .values(history)
      .returning();
    return saved;
  }
}

export const storage = new DatabaseStorage();
