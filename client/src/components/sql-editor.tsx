import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Play, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { QueryResult } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface SqlEditorProps {
  connectionId: string | null;
}

export default function SqlEditor({ connectionId }: SqlEditorProps) {
  const [query, setQuery] = useState("SELECT * FROM users LIMIT 25;");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const { toast } = useToast();

  const executeQueryMutation = useMutation({
    mutationFn: async (sqlQuery: string) => {
      if (!connectionId) throw new Error("No connection selected");
      const response = await apiRequest("POST", `/api/connections/${connectionId}/query`, {
        query: sqlQuery,
      });
      return response.json();
    },
    onSuccess: (result) => {
      setQueryResult(result);
      toast({
        title: "Query Executed",
        description: `${result.rowCount} rows returned in ${result.executionTime}ms`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Query Failed",
        description: error.message || "Failed to execute query",
        variant: "destructive",
      });
    },
  });

  const handleExecute = () => {
    if (!query.trim()) {
      toast({
        title: "Empty Query",
        description: "Please enter a SQL query to execute",
        variant: "destructive",
      });
      return;
    }
    executeQueryMutation.mutate(query);
  };

  const formatQuery = () => {
    // Basic SQL formatting
    const formatted = query
      .replace(/\s+/g, ' ')
      .replace(/SELECT/gi, '\nSELECT')
      .replace(/FROM/gi, '\nFROM')
      .replace(/WHERE/gi, '\nWHERE')
      .replace(/ORDER BY/gi, '\nORDER BY')
      .replace(/GROUP BY/gi, '\nGROUP BY')
      .replace(/HAVING/gi, '\nHAVING')
      .replace(/LIMIT/gi, '\nLIMIT')
      .trim();
    
    setQuery(formatted);
  };

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const getValueBadge = (value: any) => {
    if (value === null || value === undefined) {
      return <Badge variant="secondary" className="text-xs">NULL</Badge>;
    }
    if (typeof value === "boolean") {
      return (
        <Badge variant={value ? "default" : "secondary"} className="text-xs">
          {value ? "TRUE" : "FALSE"}
        </Badge>
      );
    }
    return null;
  };

  if (!connectionId) {
    return (
      <div className="p-6 animate-fade-in">
        <div className="bg-card rounded-lg border border-border p-8 text-center">
          <div className="mb-4">
            <i className="fas fa-terminal text-4xl text-muted-foreground mb-4"></i>
          </div>
          <h3 className="text-lg font-medium mb-2">No Connection Selected</h3>
          <p className="text-sm text-muted-foreground">
            Please select a database connection to execute SQL queries
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 animate-fade-in" data-testid="sql-editor">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            SQL Query Editor
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={formatQuery}
                data-testid="format-sql"
              >
                <Wand2 className="h-4 w-4 mr-1" />
                Format
              </Button>
              <Button
                size="sm"
                onClick={handleExecute}
                disabled={executeQueryMutation.isPending}
                data-testid="execute-sql"
              >
                <Play className="h-4 w-4 mr-1" />
                {executeQueryMutation.isPending ? "Executing..." : "Execute"}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* SQL Editor */}
          <div className="border border-border rounded-md overflow-hidden">
            <div className="bg-muted px-3 py-2 border-b border-border flex items-center justify-between">
              <span className="text-sm font-medium">Query</span>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span>PostgreSQL</span>
              </div>
            </div>
            <div className="p-4 bg-background">
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your SQL query here..."
                className="font-mono text-sm min-h-[200px] border-0 p-0 resize-none focus-visible:ring-0"
                data-testid="sql-textarea"
              />
            </div>
          </div>

          {/* Query Results */}
          {(queryResult || executeQueryMutation.isPending) && (
            <div className="border border-border rounded-md overflow-hidden">
              <div className="bg-muted px-3 py-2 border-b border-border flex items-center justify-between">
                <span className="text-sm font-medium">Results</span>
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  {queryResult && (
                    <>
                      <span>{queryResult.rowCount} rows affected</span>
                      <span>Query time: {queryResult.executionTime}ms</span>
                    </>
                  )}
                </div>
              </div>
              
              {executeQueryMutation.isPending ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : queryResult ? (
                <div className="overflow-x-auto">
                  {queryResult.rows.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {queryResult.columns.map((column) => (
                            <TableHead key={column} className="font-medium">
                              {column}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {queryResult.rows.map((row, index) => (
                          <TableRow key={index} data-testid={`result-row-${index}`}>
                            {queryResult.columns.map((column) => (
                              <TableCell key={column} className="text-sm">
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono truncate max-w-xs">
                                    {formatCellValue(row[column])}
                                  </span>
                                  {getValueBadge(row[column])}
                                </div>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      Query executed successfully. No rows returned.
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
