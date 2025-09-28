import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertConnectionSchema, type InsertConnection } from "@shared/schema";

interface ConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnectionCreated: () => void;
}

const connectionFormSchema = insertConnectionSchema.extend({
  name: insertConnectionSchema.shape.name.min(1, "Name is required"),
  host: insertConnectionSchema.shape.host.min(1, "Host is required"),
  database: insertConnectionSchema.shape.database.min(1, "Database is required"),
  username: insertConnectionSchema.shape.username.min(1, "Username is required"),
  password: insertConnectionSchema.shape.password.min(1, "Password is required"),
});

export default function ConnectionModal({
  open,
  onOpenChange,
  onConnectionCreated,
}: ConnectionModalProps) {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const { toast } = useToast();

  const form = useForm<InsertConnection>({
    resolver: zodResolver(connectionFormSchema),
    defaultValues: {
      name: "",
      host: "localhost",
      port: 5432,
      database: "",
      username: "",
      password: "",
      ssl: false,
    },
  });

  const createConnectionMutation = useMutation({
    mutationFn: async (data: InsertConnection) => {
      const response = await apiRequest("POST", "/api/connections", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Connection created successfully",
      });
      form.reset();
      onConnectionCreated();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create connection",
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (data: InsertConnection) => {
      const response = await apiRequest("POST", "/api/connections/test", data);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: result.success ? "Success" : "Failed",
        description: result.success 
          ? "Connection test successful" 
          : "Connection test failed",
        variant: result.success ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Connection test failed",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertConnection) => {
    createConnectionMutation.mutate(data);
  };

  const handleTestConnection = async () => {
    const values = form.getValues();
    const result = connectionFormSchema.safeParse(values);
    
    if (!result.success) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    setIsTestingConnection(true);
    testConnectionMutation.mutate(values);
    setIsTestingConnection(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Database Connection</DialogTitle>
          <DialogDescription>
            Enter your database connection details
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connection Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="My Database" 
                      {...field} 
                      data-testid="input-connection-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="host"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Host</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="localhost" 
                        {...field} 
                        data-testid="input-host"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Port</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="5432"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 5432)}
                        data-testid="input-port"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="database"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Database Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="my_database" 
                      {...field} 
                      data-testid="input-database"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="postgres" 
                        {...field} 
                        data-testid="input-username"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="password"
                        {...field}
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="ssl"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>SSL Connection</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-ssl"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleTestConnection}
                disabled={isTestingConnection || testConnectionMutation.isPending}
                data-testid="test-connection"
              >
                {isTestingConnection || testConnectionMutation.isPending ? "Testing..." : "Test Connection"}
              </Button>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="cancel-connection"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createConnectionMutation.isPending}
                data-testid="save-connection"
              >
                {createConnectionMutation.isPending ? "Connecting..." : "Connect"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
