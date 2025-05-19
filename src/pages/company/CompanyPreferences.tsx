
import { MainLayout } from "@/components/MainLayout";
import CompanyPreferencesTab from "@/pages/company/setup/tabs/CompanyPreferencesTab";
import { useCompany } from "@/contexts/CompanyContext";
import { getCompanyPreferences, updateCompanyPreferences } from "@/services/preferencesService";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CompanyPreferences() {
  const { company, loading: companyLoading } = useCompany();

  if (companyLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6 space-y-8">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!company) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              You need to belong to a company to view preferences.
              <Button variant="outline" className="ml-2" asChild>
                <a href="/company/setup">Create Company</a>
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <CompanyPreferencesTab companyId={company.id} />
      </div>
    </MainLayout>
  );
}
