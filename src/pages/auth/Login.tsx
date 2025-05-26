import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, Loader2, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Logo } from "@/components/branding/Logo";

// Form schema
const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address",
  }),
  password: z.string().min(1, {
    message: "Password is required",
  }),
  rememberMe: z.boolean().default(false),
});

export default function Login() {
  const { t } = useTranslation();
  const { signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginAttempted, setLoginAttempted] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  useEffect(() => {
    // Check for success message in location state (e.g., from signup)
    if (location.state?.message) {
      toast({
        title: t('common.success'),
        description: location.state.message,
      });
      // Clear the state to prevent showing the message again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, toast, t]);

  // Handle navigation after successful login
  useEffect(() => {
    if (loginAttempted && !authLoading && user) {
      // User is authenticated, navigate to dashboard
      navigate('/dashboard');
    }
  }, [loginAttempted, authLoading, user, navigate]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setError(null);
    setLoginAttempted(false);
    
    try {
      const { error: loginError } = await signIn(values.email, values.password, values.rememberMe);
      
      if (loginError) {
        throw new Error(loginError.message);
      }
      
      // Mark that login was attempted successfully
      // The useEffect above will handle navigation once auth state is updated
      setLoginAttempted(true);
      
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials and try again.');
      setLoginAttempted(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>{t('login.pageTitle')} | Circa</title>
        <meta name="description" content={t('login.pageDescription')} />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-circa-green-light px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <Logo variant="dark" className="mx-auto" />
            <p className="text-gray-600 mt-2">Carbon accounting made simple</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 pt-6 pb-4">
              <h1 className="text-2xl font-bold text-center mb-1">Welcome back</h1>
              <p className="text-gray-600 text-center text-sm mb-6">Log in to your account to continue</p>

              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="your.email@company.com" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Password</FormLabel>
                          <Link 
                            to="/auth/forgot-password" 
                            className="text-sm text-circa-green hover:underline"
                          >
                            {t('login.forgotPassword')}
                          </Link>
                        </div>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rememberMe"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox 
                            checked={field.value} 
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal cursor-pointer">
                          {t('login.rememberMe')}
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full bg-circa-green hover:bg-circa-green-dark"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </div>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </Form>
            </div>
            
            <div className="border-t p-6 bg-gray-50 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link to="/auth/signup" className="text-circa-green font-medium hover:underline">
                  Sign Up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
