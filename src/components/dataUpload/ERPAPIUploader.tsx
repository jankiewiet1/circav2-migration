import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
  Database, 
  Settings, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  Calendar,
  Download,
  Upload,
  Zap,
  Building2,
  Globe,
  Key,
  Clock,
  BarChart3
} from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";

interface ERPAPIUploaderProps {
  onUploadComplete?: () => void;
}

interface ERPConnection {
  id: string;
  name: string;
  type: 'erp' | 'crm' | 'accounting' | 'travel' | 'utility';
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  recordCount?: number;
  description: string;
  icon: React.ReactNode;
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'password' | 'url' | 'select';
    required: boolean;
    options?: string[];
    placeholder?: string;
  }>;
}

const ERP_SYSTEMS: ERPConnection[] = [
  {
    id: 'sap',
    name: 'SAP',
    type: 'erp',
    status: 'disconnected',
    description: 'Connect to SAP ERP for invoices, purchase orders, and expense data',
    icon: <Building2 className="h-5 w-5" />,
    fields: [
      { name: 'server_url', label: 'SAP Server URL', type: 'url', required: true, placeholder: 'https://your-sap-server.com' },
      { name: 'client', label: 'Client ID', type: 'text', required: true, placeholder: '100' },
      { name: 'username', label: 'Username', type: 'text', required: true, placeholder: 'your-username' },
      { name: 'password', label: 'Password', type: 'password', required: true, placeholder: 'your-password' },
      { name: 'language', label: 'Language', type: 'select', required: false, options: ['EN', 'DE', 'FR', 'ES', 'NL'] }
    ]
  },
  {
    id: 'odoo',
    name: 'Odoo',
    type: 'erp',
    status: 'disconnected',
    description: 'Connect to Odoo ERP for comprehensive business data integration',
    icon: <Database className="h-5 w-5" />,
    fields: [
      { name: 'server_url', label: 'Odoo Server URL', type: 'url', required: true, placeholder: 'https://your-odoo.com' },
      { name: 'database', label: 'Database Name', type: 'text', required: true, placeholder: 'your-database' },
      { name: 'username', label: 'Username', type: 'text', required: true, placeholder: 'admin' },
      { name: 'password', label: 'Password', type: 'password', required: true, placeholder: 'your-password' }
    ]
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    type: 'crm',
    status: 'disconnected',
    description: 'Connect to HubSpot CRM for travel, deals, and business activity data',
    icon: <Globe className="h-5 w-5" />,
    fields: [
      { name: 'access_token', label: 'Access Token', type: 'password', required: true, placeholder: 'pat-na1-...' },
      { name: 'portal_id', label: 'Portal ID', type: 'text', required: false, placeholder: '12345678' }
    ]
  },
  {
    id: 'dynamics',
    name: 'Microsoft Dynamics 365',
    type: 'erp',
    status: 'disconnected',
    description: 'Connect to Microsoft Dynamics 365 for financial and operational data',
    icon: <Building2 className="h-5 w-5" />,
    fields: [
      { name: 'tenant_id', label: 'Tenant ID', type: 'text', required: true, placeholder: 'your-tenant-id' },
      { name: 'client_id', label: 'Client ID', type: 'text', required: true, placeholder: 'your-client-id' },
      { name: 'client_secret', label: 'Client Secret', type: 'password', required: true, placeholder: 'your-client-secret' },
      { name: 'resource_url', label: 'Resource URL', type: 'url', required: true, placeholder: 'https://your-org.crm.dynamics.com' }
    ]
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    type: 'accounting',
    status: 'disconnected',
    description: 'Connect to QuickBooks for expense tracking and financial data',
    icon: <BarChart3 className="h-5 w-5" />,
    fields: [
      { name: 'company_id', label: 'Company ID', type: 'text', required: true, placeholder: 'your-company-id' },
      { name: 'access_token', label: 'Access Token', type: 'password', required: true, placeholder: 'your-access-token' },
      { name: 'refresh_token', label: 'Refresh Token', type: 'password', required: true, placeholder: 'your-refresh-token' }
    ]
  },
  {
    id: 'xero',
    name: 'Xero',
    type: 'accounting',
    status: 'disconnected',
    description: 'Connect to Xero accounting for expense and invoice data',
    icon: <BarChart3 className="h-5 w-5" />,
    fields: [
      { name: 'client_id', label: 'Client ID', type: 'text', required: true, placeholder: 'your-client-id' },
      { name: 'client_secret', label: 'Client Secret', type: 'password', required: true, placeholder: 'your-client-secret' },
      { name: 'tenant_id', label: 'Tenant ID', type: 'text', required: true, placeholder: 'your-tenant-id' }
    ]
  }
];

export const ERPAPIUploader: React.FC<ERPAPIUploaderProps> = ({ onUploadComplete }) => {
  const { company } = useCompany();
  const [activeTab, setActiveTab] = useState<string>('connect');
  const [connections, setConnections] = useState<ERPConnection[]>(ERP_SYSTEMS);
  const [selectedSystem, setSelectedSystem] = useState<ERPConnection | null>(null);
  const [connectionForm, setConnectionForm] = useState<Record<string, string>>({});
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<{
    system: string;
    recordsFound: number;
    recordsProcessed: number;
    errors: string[];
  } | null>(null);

  // Load saved connections on component mount
  useEffect(() => {
    loadSavedConnections();
  }, [company]);

  const loadSavedConnections = async () => {
    if (!company) return;
    
    try {
      // Load connections from database instead of localStorage
      const { data: savedConnections, error } = await supabase
        .from('erp_connections')
        .select('*')
        .eq('company_id', company.id);
      
      if (error) {
        console.error('Error loading connections:', error);
        return;
      }
      
      if (savedConnections && savedConnections.length > 0) {
        setConnections(prev => prev.map(conn => {
          const saved = savedConnections.find(s => s.system_type === conn.id);
          return saved ? { 
            ...conn, 
            status: saved.status as 'connected' | 'disconnected' | 'error',
            lastSync: saved.last_sync || undefined,
            recordCount: undefined // We'll calculate this from data_entries if needed
          } : conn;
        }));
      }
    } catch (error) {
      console.error('Error loading saved connections:', error);
    }
  };

  const saveConnection = async (systemId: string, credentials: Record<string, string>) => {
    if (!company) return;
    
    try {
      // Save connection to database instead of localStorage
      const systemName = ERP_SYSTEMS.find(s => s.id === systemId)?.name || systemId;
      
      const { error } = await supabase
        .from('erp_connections')
        .upsert({
          company_id: company.id,
          system_type: systemId,
          system_name: systemName,
          credentials: credentials,
          status: 'connected',
          last_sync: null
        }, {
          onConflict: 'company_id,system_type'
        });
      
      if (error) {
        console.error('Error saving connection:', error);
        throw new Error('Failed to save connection to database');
      }
      
      // Update local state
      setConnections(prev => prev.map(conn => 
        conn.id === systemId 
          ? { ...conn, status: 'connected', lastSync: new Date().toISOString() }
          : conn
      ));
      
      toast.success(`Successfully connected to ${selectedSystem?.name}!`);
    } catch (error) {
      console.error('Error saving connection:', error);
      toast.error('Failed to save connection');
      throw error;
    }
  };

  const handleConnect = async () => {
    if (!selectedSystem || !company) return;
    
    // Validate required fields
    const missingFields = selectedSystem.fields
      .filter(field => field.required && !connectionForm[field.name])
      .map(field => field.label);
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    setIsConnecting(true);
    
    try {
      // Test connection using Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('erp-integration', {
        body: {
          operation: 'test_connection',
          system_type: selectedSystem.id,
          credentials: connectionForm
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (!data.success) {
        throw new Error(data.message);
      }
      
      // Save connection if test successful
      await saveConnection(selectedSystem.id, connectionForm);
      
      setSelectedSystem(null);
      setConnectionForm({});
      setActiveTab('manage');
      
    } catch (error) {
      console.error('Connection error:', error);
      toast.error(`Failed to connect: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSync = async (systemId: string) => {
    const system = connections.find(c => c.id === systemId);
    if (!system || system.status !== 'connected') return;
    
    setIsSyncing(true);
    setSyncResults(null);
    
    try {
      // Get saved connection from database
      const { data: savedConnection, error: connectionError } = await supabase
        .from('erp_connections')
        .select('*')
        .eq('company_id', company.id)
        .eq('system_type', systemId)
        .single();
      
      if (connectionError || !savedConnection) {
        throw new Error('Connection not found in database');
      }
      
      // Sync data using Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('erp-integration', {
        body: {
          operation: 'sync_data',
          connection_id: savedConnection.id,
          company_id: company.id,
          sync_options: {
            date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
            date_to: new Date().toISOString()
          }
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (!data.success) {
        throw new Error(data.message);
      }
      
      const syncData = data.data;
      setSyncResults({
        system: system.name,
        recordsFound: syncData.records_found,
        recordsProcessed: syncData.records_processed,
        errors: []
      });
      
      // Update last sync time in database
      await supabase
        .from('erp_connections')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', savedConnection.id);
      
      // Update local state
      setConnections(prev => prev.map(conn => 
        conn.id === systemId 
          ? { ...conn, lastSync: new Date().toISOString(), recordCount: syncData.records_processed }
          : conn
      ));
      
      toast.success(`Synced ${syncData.records_processed} records from ${system.name}`);
      
      if (onUploadComplete) {
        onUploadComplete();
      }
      
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(`Sync failed: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async (systemId: string) => {
    if (!company) return;
    
    try {
      // Remove from database
      const { error } = await supabase
        .from('erp_connections')
        .delete()
        .eq('company_id', company.id)
        .eq('system_type', systemId);
      
      if (error) {
        console.error('Error disconnecting:', error);
        throw new Error('Failed to disconnect from database');
      }
      
      // Update local state
      setConnections(prev => prev.map(conn => 
        conn.id === systemId 
          ? { ...conn, status: 'disconnected', lastSync: undefined, recordCount: undefined }
          : conn
      ));
      
      toast.success('Connection removed successfully');
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Failed to disconnect');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Connected</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="secondary">Not Connected</Badge>;
    }
  };

  const connectedSystems = connections.filter(c => c.status === 'connected');
  const availableSystems = connections.filter(c => c.status === 'disconnected');

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          ERP & API Integrations
          <Badge variant="outline" className="ml-2">
            {connectedSystems.length} Connected
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connect">Connect Systems</TabsTrigger>
            <TabsTrigger value="manage">Manage Connections</TabsTrigger>
            <TabsTrigger value="sync">Sync Data</TabsTrigger>
          </TabsList>

          <TabsContent value="connect" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Available Systems</h3>
              <p className="text-sm text-gray-600">
                Connect to your business systems to automatically import emission-relevant data.
              </p>
              
              {!selectedSystem ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableSystems.map((system) => (
                    <Card key={system.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedSystem(system)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {system.icon}
                            <div>
                              <h4 className="font-medium">{system.name}</h4>
                              <p className="text-sm text-gray-600 mt-1">{system.description}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="capitalize">{system.type}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {selectedSystem.icon}
                      Connect to {selectedSystem.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <Key className="h-4 w-4" />
                      <AlertDescription>
                        Your credentials are encrypted and stored securely. We only access data necessary for carbon accounting.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedSystem.fields.map((field) => (
                        <div key={field.name} className="space-y-2">
                          <Label htmlFor={field.name}>
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          {field.type === 'select' ? (
                            <Select value={connectionForm[field.name] || ''} onValueChange={(value) => setConnectionForm(prev => ({ ...prev, [field.name]: value }))}>
                              <SelectTrigger>
                                <SelectValue placeholder={`Select ${field.label}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options?.map((option) => (
                                  <SelectItem key={option} value={option}>{option}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              id={field.name}
                              type={field.type}
                              placeholder={field.placeholder}
                              value={connectionForm[field.name] || ''}
                              onChange={(e) => setConnectionForm(prev => ({ ...prev, [field.name]: e.target.value }))}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleConnect} disabled={isConnecting}>
                        {isConnecting ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            Connect
                          </>
                        )}
                      </Button>
                      <Button variant="outline" onClick={() => setSelectedSystem(null)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Connected Systems</h3>
              
              {connectedSystems.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-600 mb-2">No Connected Systems</h4>
                    <p className="text-gray-500 mb-4">Connect to your business systems to start importing data automatically.</p>
                    <Button onClick={() => setActiveTab('connect')}>
                      <Zap className="h-4 w-4 mr-2" />
                      Connect a System
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {connectedSystems.map((system) => (
                    <Card key={system.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {system.icon}
                            <div>
                              <h4 className="font-medium">{system.name}</h4>
                              <div className="flex items-center gap-4 mt-1">
                                {getStatusBadge(system.status)}
                                {system.lastSync && (
                                  <span className="text-sm text-gray-500 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Last sync: {new Date(system.lastSync).toLocaleDateString()}
                                  </span>
                                )}
                                {system.recordCount && (
                                  <span className="text-sm text-gray-500">
                                    {system.recordCount} records
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleSync(system.id)} disabled={isSyncing}>
                              {isSyncing ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDisconnect(system.id)}>
                              Disconnect
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sync" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Data Synchronization</h3>
              <p className="text-sm text-gray-600">
                Sync data from your connected systems. We'll automatically extract emission-relevant information.
              </p>
              
              {connectedSystems.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No systems connected. Please connect to at least one system to sync data.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {connectedSystems.map((system) => (
                    <Card key={system.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {system.icon}
                            <div>
                              <h4 className="font-medium">{system.name}</h4>
                              <p className="text-sm text-gray-600">
                                Extract invoices, expenses, travel data, and utility bills
                              </p>
                            </div>
                          </div>
                          <Button onClick={() => handleSync(system.id)} disabled={isSyncing}>
                            {isSyncing ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Syncing...
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-2" />
                                Sync Now
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              
              {syncResults && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Sync Complete:</strong> Found {syncResults.recordsFound} records from {syncResults.system}, 
                    processed {syncResults.recordsProcessed} emission-relevant entries.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}; 