import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { QueryResult } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface DataTableProps {
  connectionId: string | null;
  database: string | null;
  table: string | null;
}

export default function DataTable({ connectionId, database, table }: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedColumn, setSelectedColumn] = useState("all");
  const [sortColumn, setSortColumn] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const offset = (currentPage - 1) * pageSize;

  const { data: tableData, isLoading } = useQuery<QueryResult>({
    queryKey: ["/api/connections", connectionId, "databases", database, "tables", table, "data", {
      offset,
      limit: pageSize,
      search: searchTerm || undefined,
      column: selectedColumn !== "all" ? selectedColumn : undefined,
      sort: sortColumn || undefined,
    }],
    enabled: !!(connectionId && database && table),
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIndexes = new Set(Array.from({ length: tableData?.rows.length || 0 }, (_, i) => i));
      setSelectedRows(allIndexes);
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleRowSelect = (index: number, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedRows(newSelected);
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

  const totalPages = Math.ceil((tableData?.rowCount || 0) / pageSize);

  if (!connectionId || !database || !table) {
    return (
      <div className="p-6 animate-fade-in">
        <div className="bg-card rounded-lg border border-border p-8 text-center">
          <div className="mb-4">
            <i className="fas fa-table text-4xl text-muted-foreground mb-4"></i>
          </div>
          <h3 className="text-lg font-medium mb-2">No Table Selected</h3>
          <p className="text-sm text-muted-foreground">
            Please select a table from the sidebar to view its data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 animate-fade-in" data-testid="data-table">
      {/* Filters and Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Filter & Search
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setSelectedColumn("all");
                setSortColumn("");
              }}
              data-testid="clear-filters"
            >
              Clear All
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search all columns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="search-input"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1.5 block">Filter by Column</label>
              <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                <SelectTrigger data-testid="column-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Columns</SelectItem>
                  {tableData?.columns.map((column) => (
                    <SelectItem key={column} value={column}>{column}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1.5 block">Sort by</label>
              <Select value={sortColumn} onValueChange={setSortColumn}>
                <SelectTrigger data-testid="sort-select">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No sorting</SelectItem>
                  {tableData?.columns.map((column) => (
                    <SelectItem key={column} value={column}>{column}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedRows.size === tableData?.rows.length && tableData.rows.length > 0}
                      onCheckedChange={handleSelectAll}
                      data-testid="select-all"
                    />
                  </TableHead>
                  {tableData?.columns.map((column) => (
                    <TableHead key={column} className="font-medium">
                      <div className="flex items-center space-x-1">
                        <span>{column}</span>
                        {sortColumn === column && (
                          <i className="fas fa-sort-up text-xs text-muted-foreground"></i>
                        )}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData?.rows.map((row, index) => (
                  <TableRow 
                    key={index} 
                    className={selectedRows.has(index) ? "bg-accent" : ""}
                    data-testid={`table-row-${index}`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.has(index)}
                        onCheckedChange={(checked) => handleRowSelect(index, checked as boolean)}
                        data-testid={`select-row-${index}`}
                      />
                    </TableCell>
                    {tableData.columns.map((column) => (
                      <TableCell key={column} className="text-sm">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono truncate max-w-xs">
                            {formatCellValue(row[column])}
                          </span>
                          {getValueBadge(row[column])}
                        </div>
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`edit-row-${index}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`delete-row-${index}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {tableData?.rows.length === 0 && (
                  <TableRow>
                    <TableCell 
                      colSpan={(tableData?.columns.length || 0) + 2}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No data found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        <div className="border-t border-border px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium">{Math.min(offset + 1, tableData?.rowCount || 0)}</span> to{" "}
            <span className="font-medium">
              {Math.min(offset + pageSize, tableData?.rowCount || 0)}
            </span>{" "}
            of <span className="font-medium">{tableData?.rowCount || 0}</span> results
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              data-testid="previous-page"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    data-testid={`page-${page}`}
                  >
                    {page}
                  </Button>
                );
              })}
              {totalPages > 5 && (
                <>
                  <span className="px-2 text-muted-foreground">...</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    data-testid={`page-${totalPages}`}
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              data-testid="next-page"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
