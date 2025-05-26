
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

export interface Settings {
  id: string;
  user_id: string;
  // Notification settings
  receive_upload_alerts: boolean;
  receive_deadline_notifications: boolean;
  receive_newsletter: boolean;
  // Display settings
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  date_format: string;
  preferred_currency: string;
  // Admin settings
  lock_team_changes: boolean;
  require_reviewer: boolean;
  audit_logging_enabled: boolean;
  default_member_role: string;
}

export const useSettings = (userId: string | undefined) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetchSettings();
  }, [userId]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      
      // Ensure theme is a valid type
      const validTheme = validateTheme(data.theme);
      
      // Ensure all boolean settings have proper boolean values
      const sanitizedSettings = {
        ...data,
        theme: validTheme,
        receive_upload_alerts: data.receive_upload_alerts ?? true,
        receive_deadline_notifications: data.receive_deadline_notifications ?? true,
        receive_newsletter: data.receive_newsletter ?? false,
        lock_team_changes: data.lock_team_changes ?? false,
        require_reviewer: data.require_reviewer ?? false,
        audit_logging_enabled: data.audit_logging_enabled ?? true
      };
      
      setSettings(sanitizedSettings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to validate theme
  const validateTheme = (theme: string | null | undefined): 'light' | 'dark' | 'system' => {
    if (theme === 'light' || theme === 'dark' || theme === 'system') {
      return theme;
    }
    return 'system'; // Default fallback
  };

  const updateSettings = async (newSettings: Partial<Settings>) => {
    if (!userId) return;
    
    try {
      // Validate theme if present
      if (newSettings.theme) {
        newSettings.theme = validateTheme(newSettings.theme);
      }
      
      // First check if a record exists
      const { data: existingSettings } = await supabase
        .from('settings')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      let error;
      
      if (existingSettings) {
        // Update existing record
        const result = await supabase
          .from('settings')
          .update(newSettings)
          .eq('user_id', userId);
        
        error = result.error;
      } else {
        // Insert new record
        const result = await supabase
          .from('settings')
          .insert({ 
            user_id: userId,
            ...newSettings
          });
        
        error = result.error;
      }
      
      if (error) throw error;
      
      // Update local state with new settings
      setSettings(prev => prev ? { 
        ...prev, 
        ...newSettings,
        theme: newSettings.theme ? validateTheme(newSettings.theme) : prev.theme
      } : null);
      
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    }
  };

  return { settings, loading, updateSettings };
};
