
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { getCompanyPreferences, updateCompanyPreferences } from "@/services/preferencesService";
import EmissionSourceSelect from "@/components/preferences/EmissionSourceSelect";

interface CompanyPreferencesTabProps {
  companyId: string;
}

const CompanyPreferencesTab = ({ companyId }: CompanyPreferencesTabProps) => {
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    if (!companyId) return;
    
    const fetchPreferences = async () => {
      setLoading(true);
      try {
        const data = await getCompanyPreferences(companyId);
        if (data) {
          setPreferences(data);
        }
      } catch (error) {
        console.error("Error fetching preferences:", error);
        toast.error("Failed to load company preferences");
      } finally {
        setLoading(false);
      }
    };
    
    fetchPreferences();
  }, [companyId]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSaving(true);
    try {
      await updateCompanyPreferences({
        ...preferences,
        company_id: companyId
      });
      toast.success("Company preferences updated successfully");
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to update company preferences");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleEmissionSourceChange = (value: string) => {
    setPreferences(prev => ({
      ...prev,
      preferred_emission_source: value
    }));
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Preferences</h2>
        <p className="text-muted-foreground">
          Configure your company's preferences for reporting and emissions calculation.
        </p>
      </div>
      
      <Separator />
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Emission Settings</CardTitle>
              <CardDescription>
                Configure how emissions are calculated and displayed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <EmissionSourceSelect 
                value={preferences.preferred_emission_source}
                onChange={handleEmissionSourceChange}
                disabled={loading}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSaving || loading}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
};

export default CompanyPreferencesTab;
