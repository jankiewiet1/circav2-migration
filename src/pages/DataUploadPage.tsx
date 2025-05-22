import React, { useState } from 'react';
import { AgentUpload } from '@/components/AgentUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export default function DataUploadPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('ai-powered');
  const [extractedData, setExtractedData] = useState<any>(null);
  
  // Get the user's company ID - this would normally come from your auth context
  // For now we'll use a placeholder
  const companyId = "current-company-id";
  
  const handleDataExtracted = async (data: any) => {
    console.log('Extracted data:', data);
    setExtractedData(data);
    
    // Show success toast
    toast({
      title: "Data Extracted Successfully",
      description: data.requires_review 
        ? "The data needs review before being saved" 
        : "The data has been extracted and is ready to be saved",
      variant: "default"
    });
    
    // If data doesn't need review, save it automatically
    if (!data.requires_review) {
      await saveToEmissionEntry(data.data);
    }
  };
  
  const saveToEmissionEntry = async (data: any) => {
    try {
      // Map the data to the actual emission_entries table schema
      const entryData = {
        company_id: companyId,
        date: data.date || new Date().toISOString().split('T')[0],
        description: data.description || 'Extracted from file',
        quantity: data.amount || 0,
        unit: data.amount_unit || 'kWh',
        year: data.year || new Date().getFullYear(),
        category: data.type || 'electricity',
        notes: `Supplier: ${data.supplier || 'Unknown'}, Energy Source: ${data.energy_source || 'Unknown'}`,
        scope: data.ghg_category === 'Scope 1' ? 1 : data.ghg_category === 'Scope 2' ? 2 : data.ghg_category === 'Scope 3' ? 3 : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('Saving to emission_entries:', entryData);
      
      // Save to emission_entries table
      const { data: savedData, error } = await supabase
        .from('emission_entries')
        .insert(entryData);
      
      if (error) {
        console.error('Error saving to database:', error);
        throw error;
      }
      
      toast({
        title: "Data Saved",
        description: "The extracted data has been saved to your emission entries",
        variant: "default"
      });
      
      // Clear the extracted data
      setExtractedData(null);
      
    } catch (error) {
      console.error('Error saving data:', error);
      toast({
        title: "Error Saving Data",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  };
  
  const handleManualSave = async () => {
    if (extractedData && extractedData.data) {
      await saveToEmissionEntry(extractedData.data);
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Emission Data Management</h1>
      
      <Tabs defaultValue="ai-powered" onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-[400px] mb-6">
          <TabsTrigger value="ai-powered">AI-Powered</TabsTrigger>
          <TabsTrigger value="classic">Classic Mode</TabsTrigger>
        </TabsList>
        
        <TabsContent value="ai-powered" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AgentUpload 
              companyId={companyId} 
              onDataExtracted={handleDataExtracted}
            />
            
            {extractedData && extractedData.success && extractedData.requires_review && (
              <Card>
                <CardHeader>
                  <CardTitle>Review Extracted Data</CardTitle>
                  <CardDescription>
                    Review the extracted data before saving to your emission entries
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {extractedData.data && Object.entries(extractedData.data).map(([key, value]) => (
                        <div key={key} className="border p-2 rounded">
                          <div className="text-sm font-medium text-gray-500">{key}</div>
                          <div>{String(value)}</div>
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      onClick={handleManualSave} 
                      className="w-full"
                    >
                      Save to Emission Entries
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="classic">
          <Card>
            <CardHeader>
              <CardTitle>Manual Upload</CardTitle>
              <CardDescription>
                Upload your emission data files manually
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center w-full">
                <label 
                  htmlFor="classic-file-upload" 
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      CSV, Excel, PDF or image files
                    </p>
                  </div>
                  <input 
                    id="classic-file-upload" 
                    type="file" 
                    className="hidden" 
                  />
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 