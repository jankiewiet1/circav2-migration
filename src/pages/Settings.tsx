import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/MainLayout";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/hooks/useSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  Loader2
} from "lucide-react";
import { toast } from "@/components/ui/sonner";

export default function Settings() {
  const { loading: companyLoading } = useCompany();
  const { user } = useAuth();
  const { settings, loading: settingsLoading, updateSettings } = useSettings(user?.id);
  
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  
  const loading = companyLoading || settingsLoading;

  const handleNotificationsSubmit = async () => {
    if (!user?.id) return;
    
    setLoadingNotifications(true);
    try {
      await updateSettings({
        receive_upload_alerts: settings?.receive_upload_alerts,
        receive_deadline_notifications: settings?.receive_deadline_notifications,
        receive_newsletter: settings?.receive_newsletter
      });
      toast.success('Notification preferences updated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update notification preferences');
    } finally {
      setLoadingNotifications(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-500 mt-2">Manage your notification preferences</p>
        </div>
        
        <div className="max-w-xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Control when and how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="upload-alerts" className="flex flex-col space-y-1">
                    <span>Upload Alerts</span>
                    <span className="font-normal text-sm text-gray-500">Get notified when new data is uploaded</span>
                  </Label>
                  <Switch 
                    id="upload-alerts"
                    checked={settings?.receive_upload_alerts}
                    onCheckedChange={(checked) => {
                      updateSettings({ receive_upload_alerts: checked });
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="deadline-notifications" className="flex flex-col space-y-1">
                    <span>Deadline Notifications</span>
                    <span className="font-normal text-sm text-gray-500">Get notified about upcoming deadlines</span>
                  </Label>
                  <Switch 
                    id="deadline-notifications"
                    checked={settings?.receive_deadline_notifications}
                    onCheckedChange={(checked) => {
                      updateSettings({ receive_deadline_notifications: checked });
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="newsletter" className="flex flex-col space-y-1">
                    <span>Newsletter</span>
                    <span className="font-normal text-sm text-gray-500">Receive our newsletter with updates and tips</span>
                  </Label>
                  <Switch 
                    id="newsletter"
                    checked={settings?.receive_newsletter}
                    onCheckedChange={(checked) => {
                      updateSettings({ receive_newsletter: checked });
                    }}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleNotificationsSubmit}
                disabled={loadingNotifications}
              >
                {loadingNotifications ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
