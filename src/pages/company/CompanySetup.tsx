import { useEffect, useState } from "react";
import { MainLayout } from "@/components/MainLayout";
import { useCompany } from "@/contexts/CompanyContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, Settings, AlertCircle, Save } from "lucide-react";
import CompanyInfoTab from "./setup/tabs/CompanyInfoTab";
import CompanyTeamTab from "./setup/tabs/CompanyTeamTab";
import CompanyPreferencesTab from "./setup/tabs/CompanyPreferencesTab";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

export default function CompanySetup() {
  const { company, loading, error, fetchCompanyData } = useCompany();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("info");
  
  useEffect(() => {
    // If the user already has completed the setup, redirect to dashboard
    if (company?.setup_completed) {
      navigate("/dashboard");
    }
  }, [company, navigate]);
  
  const handleRetry = async () => {
    await fetchCompanyData();
  };
  
  const handleSave = async () => {
    try {
      await fetchCompanyData();
      toast.success("Company information updated successfully");
    } catch (error) {
      console.error("Error saving company:", error);
      toast.error("Failed to save company information");
    }
  };
  
  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <Skeleton className="h-12 w-60 mb-2" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
          <Skeleton className="h-[500px] w-full rounded-md" />
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Company Setup</h1>
              <p className="text-muted-foreground">
                Configure your company information to get started with carbon accounting
              </p>
            </div>
            {activeTab === "info" && (
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  form="company-form"
                  size="sm" 
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" /> Save
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Error loading company data: {error.message}
              <Button variant="link" onClick={handleRetry} className="ml-2 p-0">
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>
              Fill in all required information to set up your company profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs 
              defaultValue="info"
              value={activeTab} 
              onValueChange={setActiveTab}
              className="space-y-6"
            >
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="info" className="flex items-center">
                  <Building2 className="mr-2 h-4 w-4" />
                  Company Info
                </TabsTrigger>
                <TabsTrigger value="team" className="flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  Team Members
                </TabsTrigger>
                <TabsTrigger value="preferences" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Preferences
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="info">
                <CompanyInfoTab onSave={handleSave} />
              </TabsContent>
              
              <TabsContent value="team">
                <CompanyTeamTab />
              </TabsContent>
              
              <TabsContent value="preferences" className="space-y-6">
                {company?.id ? (
                  <CompanyPreferencesTab companyId={company.id} />
                ) : (
                  <Alert>
                    <AlertTitle>Complete the company info first</AlertTitle>
                    <AlertDescription>
                      Please complete the "Company Info" tab before setting preferences.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
