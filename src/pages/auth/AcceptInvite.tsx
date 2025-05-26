import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Logo } from "@/components/branding/Logo";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Form validation schema
const acceptInviteSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().min(1, { message: 'Last name is required' }),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

type AcceptInviteFormData = z.infer<typeof acceptInviteSchema>;

interface InvitationData {
  id: string;
  email: string;
  role: string;
  company_id: string;
  invited_by: string | null;
  companyName?: string;
  inviterName?: string;
}

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);

  const email = searchParams.get('email');

  const form = useForm<AcceptInviteFormData>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: email || '',
      password: '',
      confirmPassword: ''
    }
  });

  // Load invitation data
  useEffect(() => {
    const loadInvitationData = async () => {
      if (!email) {
        setError('Invalid invitation link - missing email parameter');
        setLoading(false);
        return;
      }

      try {
        // Get invitation data
        const { data: invitationData, error: invitationError } = await supabase
          .from('company_invitations')
          .select('*, companies(name)')
          .eq('email', email)
          .eq('status', 'pending')
          .single();

        if (invitationError || !invitationData) {
          setError('Invitation not found or has already been used');
          setLoading(false);
          return;
        }

        // Get inviter information (only if invited_by is not null)
        let inviterData = null;
        if (invitationData.invited_by) {
          const { data } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', invitationData.invited_by)
            .single();
          inviterData = data;
        }

        setInvitationData({
          id: invitationData.id,
          email: invitationData.email,
          role: invitationData.role,
          company_id: invitationData.company_id,
          invited_by: invitationData.invited_by,
          companyName: invitationData.companies?.name || 'Unknown Company',
          inviterName: inviterData ? `${inviterData.first_name} ${inviterData.last_name}`.trim() : 'A team member'
        });

        // Pre-fill email in form
        form.setValue('email', email);
      } catch (error: any) {
        console.error('Error loading invitation:', error);
        setError('Failed to load invitation details');
      } finally {
        setLoading(false);
      }
    };

    loadInvitationData();
  }, [email, form]);

  const handleSubmit = async (data: AcceptInviteFormData) => {
    if (!invitationData) return;

    setSubmitting(true);
    setError(null);

    try {
      // 1. Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      console.log('User created successfully:', authData.user.id);

      // 2. Use the edge function to handle company membership and invitation acceptance
      const { data: acceptResult, error: acceptError } = await supabase.functions.invoke('accept-invitation', {
        body: {
          userId: authData.user.id,
          invitationId: invitationData.id,
          companyId: invitationData.company_id,
          role: invitationData.role
        }
      });

      console.log('Edge function response:', { acceptResult, acceptError });

      if (acceptError) {
        console.error('Error accepting invitation via edge function:', acceptError);
        throw new Error(`Failed to complete invitation acceptance: ${acceptError.message || 'Unknown error'}. Please contact support at info@circa.site`);
      }

      // Check if the edge function returned an error in the response
      if (acceptResult && !acceptResult.success) {
        console.error('Edge function returned error:', acceptResult);
        throw new Error(acceptResult.message || 'Failed to complete invitation acceptance. Please contact support at info@circa.site');
      }

      setSuccess(true);
      toast.success('Account created successfully! You can now log in.');

      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/auth/login');
      }, 3000);

    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      setError(error.message || 'An error occurred while creating your account');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Full access to manage the company, team members, and all data';
      case 'editor':
        return 'Access to view and edit emission data and reports';
      case 'viewer':
        return 'Read-only access to view emission data and reports';
      default:
        return 'Access to the platform';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading invitation details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <Helmet>
          <title>Invalid Invitation | Circa</title>
        </Helmet>
        <div className="flex min-h-screen flex-col">
          <header className="border-b py-4">
            <div className="container flex items-center justify-between">
              <Link to="/">
                <Logo className="h-8" />
              </Link>
            </div>
          </header>
          <main className="flex-1 container py-12">
            <div className="max-w-md mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-center text-red-600">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    Invalid Invitation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                  <div className="mt-6 text-center">
                    <Button asChild>
                      <Link to="/">Return to Homepage</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </>
    );
  }

  if (success) {
    return (
      <>
        <Helmet>
          <title>Welcome to Circa | Account Created</title>
        </Helmet>
        <div className="flex min-h-screen flex-col">
          <header className="border-b py-4">
            <div className="container flex items-center justify-between">
              <Link to="/">
                <Logo className="h-8" />
              </Link>
            </div>
          </header>
          <main className="flex-1 container py-12">
            <div className="max-w-md mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-center text-green-600">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2" />
                    Welcome to {invitationData?.companyName}!
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-700 mb-6">
                    Your account has been created successfully. You'll be redirected to the login page shortly.
                  </p>
                  <Button asChild>
                    <Link to="/auth/login">Go to Login</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Accept Invitation | Circa</title>
        <meta name="description" content="Accept your invitation to join a team on Circa" />
      </Helmet>

      <div className="flex min-h-screen flex-col">
        <header className="border-b py-4">
          <div className="container flex items-center justify-between">
            <Link to="/">
              <Logo className="h-8" />
            </Link>
            <Button variant="ghost" asChild>
              <Link to="/auth/login">Already have an account?</Link>
            </Button>
          </div>
        </header>

        <main className="flex-1 container py-12">
          <div className="max-w-md mx-auto">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold tracking-tight mb-3">
                You're Invited!
              </h1>
              <p className="text-lg text-gray-600">
                {invitationData?.inviterName} has invited you to join{' '}
                <strong>{invitationData?.companyName}</strong> on Circa
              </p>
            </div>

            {invitationData && (
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Company:</span>
                      <span>{invitationData.companyName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Your Role:</span>
                      <span className="capitalize">{invitationData.role}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                      <strong>Role Description:</strong> {getRoleDescription(invitationData.role)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Create Your Account</CardTitle>
                <CardDescription>
                  Complete your profile to join the team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        {...form.register('firstName')}
                        disabled={submitting}
                      />
                      {form.formState.errors.firstName && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        {...form.register('lastName')}
                        disabled={submitting}
                      />
                      {form.formState.errors.lastName && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register('email')}
                      disabled={true} // Email is pre-filled and cannot be changed
                      className="bg-gray-50"
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      {...form.register('password')}
                      disabled={submitting}
                    />
                    {form.formState.errors.password && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      {...form.register('confirmPassword')}
                      disabled={submitting}
                    />
                    {form.formState.errors.confirmPassword && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Accept Invitation & Create Account'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>

        <footer className="py-6 border-t">
          <div className="container text-center text-sm text-gray-500">
            <p>© {new Date().getFullYear()} Circa. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
} 