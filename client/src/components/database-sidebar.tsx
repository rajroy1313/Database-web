import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Database, Table, Plug, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import ConnectionModal from "./connection-modal";
import { Connection, DatabaseTable } from "@shared/schema";
import { cn } from "@/lib/utils";

interface DatabaseSidebarProps {
  selectedConnection: string | null;
  selectedDatabase: string | null;
  selectedTable: string | null;
  onConnectionSelect: (connectionId: string) => void;
  onDatabaseSelect: (database: string) => void;
  onTableSelect: (table: string) => void;
}

export default function DatabaseSidebar({
  selectedConnection,
  selectedDatabase,
  selectedTable,
  onConnectionSelect,
  onDatabaseSelect,
  onTableSelect,
}: DatabaseSidebarProps) {
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [expandedDatabases, setExpandedDatabases] = useState<Set<string>>(new Set());

  const { data: connections = [], refetch: refetchConnections } = useQuery<Connection[]>({
    queryKey: ["/api/connections"],
    enabled: true,
  });

  const { data: databases = [] } = useQuery<string[]>({
    queryKey: ["/api/connections", selectedConnection, "databases"],
    enabled: !!selectedConnection,
  });

  const { data: tables = [] } = useQuery<DatabaseTable[]>({
    queryKey: ["/api/connections", selectedConnection, "databases", selectedDatabase, "tables"],
    enabled: !!selectedConnection && !!selectedDatabase,
  });

  const currentConnection = connections.find(c => c.id === selectedConnection);

  const toggleDatabase = (database: string) => {
    const newExpanded = new Set(expandedDatabases);
    if (newExpanded.has(database)) {
      newExpanded.delete(database);
    } else {
      newExpanded.add(database);
    }
    setExpandedDatabases(newExpanded);
    onDatabaseSelect(database);
  };

  const handleConnectionSelect = (connection: Connection) => {
    onConnectionSelect(connection.id);
    onDatabaseSelect("");
    onTableSelect("");
  };

  return (
    <>
      <aside className="w-64 bg-card border-r border-border flex flex-col shadow-sm">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Database className="text-primary-foreground text-sm" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">DB Manager</h1>
              <p className="text-xs text-muted-foreground">Database Interface</p>
            </div>
          </div>
        </div>
        
        {/* Connection Status */}
        {currentConnection && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center space-x-2" data-testid="connection-status">
              <div className="w-2 h-2 rounded-full bg-green-500 connection-status"></div>
              <span className="text-sm font-medium">Connected</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate" data-testid="connection-string">
              {currentConnection.host}:{currentConnection.port}/{currentConnection.database}
            </p>
          </div>
        )}
        
        {/* Database Tree */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Connections
            </div>
            
            {connections.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No connections found
              </div>
            ) : (
              connections.map(connection => (
                <div key={connection.id} className="space-y-1">
                  <div
                    className={cn(
                      "flex items-center space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer",
                      selectedConnection === connection.id && "bg-accent"
                    )}
                    onClick={() => handleConnectionSelect(connection)}
                    data-testid={`connection-${connection.name}`}
                  >
                    <Database className="text-muted-foreground text-xs h-4 w-4" />
                    <span className="text-sm font-medium truncate">{connection.name}</span>
                  </div>
                  
                  {selectedConnection === connection.id && databases.length > 0 && (
                    <div className="ml-6 space-y-1">
                      {databases.map(database => (
                        <div key={database} className="space-y-1">
                          <div
                            className={cn(
                              "flex items-center space-x-2 p-1.5 rounded-md hover:bg-accent cursor-pointer",
                              selectedDatabase === database && "bg-accent"
                            )}
                            onClick={() => toggleDatabase(database)}
                            data-testid={`database-${database}`}
                          >
                            {expandedDatabases.has(database) ? (
                              <ChevronDown className="text-muted-foreground text-xs h-3 w-3" />
                            ) : (
                              <ChevronRight className="text-muted-foreground text-xs h-3 w-3" />
                            )}
                            <Database className="text-muted-foreground text-xs h-3 w-3" />
                            <span className="text-sm truncate">{database}</span>
                          </div>
                          
                          {expandedDatabases.has(database) && selectedDatabase === database && (
                            <div className="ml-6 space-y-1">
                              {tables.map(table => (
                                <div
                                  key={table.name}
                                  className={cn(
                                    "flex items-center space-x-2 p-1.5 rounded-md hover:bg-accent cursor-pointer",
                                    selectedTable === table.name && "bg-accent"
                                  )}
                                  onClick={() => onTableSelect(table.name)}
                                  data-testid={`table-${table.name}`}
                                >
                                  <Table className="text-muted-foreground text-xs h-3 w-3" />
                                  <span className="text-sm truncate">{table.name}</span>
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    {table.rowCount.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="p-4 border-t border-border space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setShowConnectionModal(true)}
            data-testid="new-connection"
          >
            <Plug className="h-4 w-4 mr-2" />
            New Connection
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => refetchConnections()}
            data-testid="refresh"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </aside>

      <ConnectionModal
        open={showConnectionModal}
        onOpenChange={setShowConnectionModal}
        onConnectionCreated={() => {
          setShowConnectionModal(false);
          refetchConnections();
        }}
      />
    </>
  );
}
