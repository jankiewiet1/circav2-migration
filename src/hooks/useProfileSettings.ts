
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { UserWithProfile } from '@/types';
import { Settings } from './useSettings';

export const useProfileSettings = (user: UserWithProfile | null) => {
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        // Fetch user settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileError) throw profileError;
        if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

        console.log("Profile data loaded:", profileData);
        setProfile(profileData);
        
        if (settingsData) {
          // Ensure theme is a valid value
          const validTheme = validateTheme(settingsData.theme);
          setSettings({
            ...settingsData,
            theme: validTheme
          });
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user?.id]);

  // Helper function to validate theme
  const validateTheme = (theme: string | null | undefined): 'light' | 'dark' | 'system' => {
    if (theme === 'light' || theme === 'dark' || theme === 'system') {
      return theme;
    }
    return 'system'; // Default fallback
  };

  const updateProfile = async (updatedProfile: any) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updatedProfile)
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => ({ ...prev, ...updatedProfile }));
      toast.success('Profile updated successfully');
      setIsEditing(false); // Exit edit mode after successful update
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const updatePreferences = async (updatedPreferences: Partial<Settings>) => {
    if (!user) return;

    try {
      // Ensure theme is a valid value
      if (updatedPreferences.theme) {
        updatedPreferences.theme = validateTheme(updatedPreferences.theme);
      }
      
      // First check if a settings record exists
      const { data: existingSettings } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      let result;
      if (existingSettings) {
        // Update existing record
        result = await supabase
          .from('settings')
          .update(updatedPreferences)
          .eq('user_id', user.id);
      } else {
        // Insert new record
        result = await supabase
          .from('settings')
          .insert({ 
            user_id: user.id, 
            ...updatedPreferences 
          });
      }

      const { error } = result;
      if (error) throw error;

      if (settings) {
        setSettings(prev => {
          if (!prev) return null;
          return { 
            ...prev, 
            ...updatedPreferences,
            theme: validateTheme(updatedPreferences.theme || prev.theme)
          };
        });
      }
      toast.success('Preferences updated successfully');
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
    }
  };

  const changePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      toast.success('Password updated successfully');
      return { error: null };
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password: ' + error.message);
      return { error };
    }
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  return {
    profile,
    settings,
    loading,
    isEditing,
    toggleEditMode,
    updateProfile,
    updatePreferences,
    changePassword
  };
};
