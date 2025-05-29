import React, { useState } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Upload,
  Sparkles,
  PlusCircle,
  Database,
} from "lucide-react";
import { MainLayout } from "@/components/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIUploader } from "@/components/dataUpload/AIUploader";
import { ERPAPIUploader } from "@/components/dataUpload/ERPAPIUploader";
import { CSVUploader } from "@/components/dataUpload/CSVUploader";
import { ManualEntryForm } from "@/components/dataUpload/ManualEntryForm";

export default function DataUpload() {
  const { company } = useCompany();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<string>("manual");

  const handleUploadComplete = () => {
    toast.success("Data uploaded successfully!");
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6 max-w-screen-2xl">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center space-x-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Data Upload</h1>
              <p className="text-gray-500 mt-1">
                Upload and manage your emission data
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => navigate('/data-traceability')}
              className="border-gray-200"
            >
              <Database className="w-4 h-4 mr-2" />
              View Data Traceability
            </Button>
          </div>
        </div>

        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 bg-gray-100 p-1 w-full justify-start">
            <TabsTrigger value="manual" className="data-[state=active]:bg-white flex-1">
              <PlusCircle className="mr-2 h-4 w-4" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="csv" className="data-[state=active]:bg-white flex-1">
              <Upload className="mr-2 h-4 w-4" />
              CSV Upload
            </TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-white flex-1">
              <Sparkles className="mr-2 h-4 w-4" />
              AI Upload
            </TabsTrigger>
            <TabsTrigger value="erpapi" className="data-[state=active]:bg-white flex-1">
              <Database className="mr-2 h-4 w-4" />
              ERP/API
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium">Manual Data Entry</h2>
              </div>
              <ManualEntryForm onEntryCreated={handleUploadComplete} />
            </div>
          </TabsContent>

          <TabsContent value="csv" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium">CSV Data Upload</h2>
              </div>
              <CSVUploader onUploadComplete={handleUploadComplete} />
            </div>
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">AI-Powered Data Upload</h2>
            </div>
            <AIUploader onUploadComplete={handleUploadComplete} />
          </TabsContent>

          <TabsContent value="erpapi" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">ERP/API Data Upload</h2>
            </div>
            <ERPAPIUploader onUploadComplete={handleUploadComplete} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

