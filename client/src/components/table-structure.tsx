import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableColumn } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface TableStructureProps {
  connectionId: string | null;
  database: string | null;
  table: string | null;
}

export default function TableStructure({ connectionId, database, table }: TableStructureProps) {
  const { data: columns = [], isLoading } = useQuery<TableColumn[]>({
    queryKey: ["/api/connections", connectionId, "databases", database, "tables", table, "structure"],
    enabled: !!(connectionId && database && table),
  });

  const getKeyBadge = (column: TableColumn) => {
    if (column.isPrimaryKey) {
      return <Badge variant="default" className="text-xs">PRI</Badge>;
    }
    if (column.isUnique) {
      return <Badge variant="secondary" className="text-xs">UNI</Badge>;
    }
    return null;
  };

  if (!connectionId || !database || !table) {
    return (
      <div className="p-6 animate-fade-in">
        <div className="bg-card rounded-lg border border-border p-8 text-center">
          <div className="mb-4">
            <i className="fas fa-cog text-4xl text-muted-foreground mb-4"></i>
          </div>
          <h3 className="text-lg font-medium mb-2">No Table Selected</h3>
          <p className="text-sm text-muted-foreground">
            Please select a table from the sidebar to view its structure
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 animate-fade-in" data-testid="table-structure">
      <Card>
        <CardHeader>
          <CardTitle>Table Structure</CardTitle>
          <CardDescription>
            Column definitions and constraints for {table}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium">Column</TableHead>
                    <TableHead className="font-medium">Type</TableHead>
                    <TableHead className="font-medium">Null</TableHead>
                    <TableHead className="font-medium">Key</TableHead>
                    <TableHead className="font-medium">Default</TableHead>
                    <TableHead className="font-medium">Extra</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {columns.map((column) => (
                    <TableRow 
                      key={column.name} 
                      className="hover:bg-accent"
                      data-testid={`column-${column.name}`}
                    >
                      <TableCell className="text-sm font-mono font-medium">
                        {column.name}
                      </TableCell>
                      <TableCell className="text-sm">
                        {column.type}
                      </TableCell>
                      <TableCell className="text-sm">
                        {column.nullable ? "YES" : "NO"}
                      </TableCell>
                      <TableCell>
                        {getKeyBadge(column)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {column.defaultValue || "NULL"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {column.extra || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {columns.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No columns found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
