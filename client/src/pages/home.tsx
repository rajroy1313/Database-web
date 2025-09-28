import { useState } from "react";
import DatabaseSidebar from "@/components/database-sidebar";
import DataTable from "@/components/data-table";
import SqlEditor from "@/components/sql-editor";
import TableStructure from "@/components/table-structure";
import { Button } from "@/components/ui/button";
import { Download, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "browse" | "structure" | "sql" | "export";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("browse");
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const handleExport = async (format: 'csv' | 'json') => {
    if (!selectedConnection || !selectedDatabase || !selectedTable) return;
    
    try {
      const response = await fetch(
        `/api/connections/${selectedConnection}/databases/${selectedDatabase}/tables/${selectedTable}/export?format=${format}`
      );
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedTable}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const tabs = [
    { id: "browse", label: "Browse", icon: "fas fa-table" },
    { id: "structure", label: "Structure", icon: "fas fa-cog" },
    { id: "sql", label: "SQL", icon: "fas fa-terminal" },
    { id: "export", label: "Export", icon: "fas fa-download" },
  ] as const;

  return (
    <div className="flex h-screen overflow-hidden" data-testid="database-manager">
      <DatabaseSidebar
        selectedConnection={selectedConnection}
        selectedDatabase={selectedDatabase}
        selectedTable={selectedTable}
        onConnectionSelect={setSelectedConnection}
        onDatabaseSelect={setSelectedDatabase}
        onTableSelect={setSelectedTable}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold" data-testid="current-table">
              {selectedTable || "Select a table"}
            </h2>
            {selectedTable && (
              <div className="text-sm text-muted-foreground">
                <span data-testid="table-info">PostgreSQL Table</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {activeTab === "export" && selectedTable && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('csv')}
                  data-testid="export-csv"
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('json')}
                  data-testid="export-json"
                >
                  <Download className="h-4 w-4 mr-2" />
                  JSON
                </Button>
              </>
            )}
            {activeTab === "browse" && selectedTable && (
              <Button size="sm" data-testid="add-row">
                <Plus className="h-4 w-4 mr-2" />
                Add Row
              </Button>
            )}
          </div>
        </header>
        
        {/* Tab Navigation */}
        <nav className="bg-card border-b border-border px-6">
          <div className="flex space-x-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "py-3 px-1 border-b-2 font-medium text-sm transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                data-testid={`tab-${tab.id}`}
              >
                <i className={`${tab.icon} mr-2`} />
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
        
        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-muted">
          {activeTab === "browse" && (
            <DataTable
              connectionId={selectedConnection}
              database={selectedDatabase}
              table={selectedTable}
            />
          )}
          
          {activeTab === "structure" && (
            <TableStructure
              connectionId={selectedConnection}
              database={selectedDatabase}
              table={selectedTable}
            />
          )}
          
          {activeTab === "sql" && (
            <SqlEditor
              connectionId={selectedConnection}
            />
          )}
          
          {activeTab === "export" && (
            <div className="p-6 animate-fade-in">
              <div className="bg-card rounded-lg border border-border p-8 text-center">
                <div className="mb-4">
                  <i className="fas fa-download text-4xl text-muted-foreground mb-4"></i>
                </div>
                <h3 className="text-lg font-medium mb-2">Export Table Data</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {selectedTable 
                    ? `Export data from the "${selectedTable}" table`
                    : "Select a table to export its data"
                  }
                </p>
                {selectedTable && (
                  <div className="flex justify-center space-x-4">
                    <Button 
                      onClick={() => handleExport('csv')}
                      data-testid="export-csv-main"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export as CSV
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleExport('json')}
                      data-testid="export-json-main"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export as JSON
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
