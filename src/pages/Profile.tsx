import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileSettings } from '@/hooks/useProfileSettings';
import { 
  UserRound, 
  Lock, 
  Loader2, 
  Mail, 
  Phone, 
  Briefcase, 
  Building2,
  EyeIcon,
  EyeOffIcon,
  Pencil,
  Save,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import { useCompany } from '@/contexts/CompanyContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const { 
    profile, 
    settings,
    loading, 
    isEditing,
    toggleEditMode,
    updateProfile, 
    updatePreferences,
    changePassword
  } = useProfileSettings(user);
  const { company } = useCompany();

  const [localProfile, setLocalProfile] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    job_title: '',
    department: '',
  });

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setLocalProfile({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone_number: profile.phone_number || '',
        job_title: profile.job_title || '',
        department: profile.department || '',
      });
    }
  }, [profile]);

  const getInitials = () => {
    if (!profile) return 'U';
    return `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`;
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile(localProfile);
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsSubmittingPassword(true);
    
    try {
      const { error } = await changePassword(newPassword);
      
      if (error) throw error;
      
      setNewPassword('');
      setConfirmPassword('');
      setIsChangePasswordOpen(false);
    } catch (error) {
      console.error('Error changing password:', error);
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6 p-6">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserRound className="h-4 w-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Lock className="h-4 w-4" /> Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Personal Information</CardTitle>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      form="profile-form" 
                      size="sm" 
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" /> Save
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={toggleEditMode} 
                      className="flex items-center gap-2"
                    >
                      <X className="h-4 w-4" /> Cancel
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={toggleEditMode} 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-2"
                  >
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <form id="profile-form" onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="flex items-center space-x-6">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-circa-green text-white text-xl">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <h3 className="text-lg font-semibold">
                        {profile?.first_name} {profile?.last_name}
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center gap-2">
                        <Mail className="h-4 w-4" /> {user?.email}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> Company
                    </Label>
                    <Input 
                      value={company?.name || 'Not assigned to a company'}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input 
                        value={localProfile.first_name} 
                        onChange={(e) => setLocalProfile(prev => ({ 
                          ...prev, 
                          first_name: e.target.value 
                        }))}
                        disabled={!isEditing}
                        className={!isEditing ? "bg-gray-50" : ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input 
                        value={localProfile.last_name} 
                        onChange={(e) => setLocalProfile(prev => ({ 
                          ...prev, 
                          last_name: e.target.value 
                        }))}
                        disabled={!isEditing}
                        className={!isEditing ? "bg-gray-50" : ""}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Phone className="h-4 w-4" /> Phone Number
                      </Label>
                      <Input 
                        value={localProfile.phone_number} 
                        onChange={(e) => setLocalProfile(prev => ({ 
                          ...prev, 
                          phone_number: e.target.value 
                        }))}
                        disabled={!isEditing}
                        className={!isEditing ? "bg-gray-50" : ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" /> Job Title
                      </Label>
                      <Input 
                        value={localProfile.job_title} 
                        onChange={(e) => setLocalProfile(prev => ({ 
                          ...prev, 
                          job_title: e.target.value 
                        }))}
                        disabled={!isEditing}
                        className={!isEditing ? "bg-gray-50" : ""}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> Department
                    </Label>
                    <Input 
                      value={localProfile.department} 
                      onChange={(e) => setLocalProfile(prev => ({ 
                        ...prev, 
                        department: e.target.value 
                      }))}
                      disabled={!isEditing}
                      className={!isEditing ? "bg-gray-50" : ""}
                    />
                  </div>

                  {isEditing && (
                    <Button type="submit" className="w-full">
                      Save Profile Changes
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Account Security</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                      value={user?.email || ''} 
                      disabled 
                      className="bg-gray-100" 
                    />
                  </div>
                  <Button 
                    variant="destructive"
                    onClick={() => setIsChangePasswordOpen(true)}
                  >
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your new password below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <Button 
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                />
                <Button 
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangePasswordOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handlePasswordChange}
              disabled={isSubmittingPassword}
            >
              {isSubmittingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
