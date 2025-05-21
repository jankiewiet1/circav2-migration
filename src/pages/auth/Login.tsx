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
import { AlertCircle, Loader2, Lock, Mail } from 'lucide-react';
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
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setError(null);
    
    try {
      const { error: loginError } = await login(values.email, values.password);
      
      if (loginError) {
        throw new Error(loginError.message);
      }
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials and try again.');
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

      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="border-b py-4 bg-white shadow-sm">
          <div className="container flex items-center justify-between">
            <Link to="/">
              <Logo className="h-10" />
            </Link>
            <Button variant="outline" className="border-circa-green text-circa-green hover:bg-circa-green/10" asChild>
              <Link to="/auth/signup">{t('common.signup')}</Link>
            </Button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6 md:p-12">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-circa-green p-6 text-white text-center">
              <h1 className="text-2xl font-bold tracking-tight">{t('login.welcomeBack')}</h1>
              <p className="mt-2 opacity-90">{t('login.signInToContinue')}</p>
            </div>

            <div className="p-8">
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {t('common.email')}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="your.email@company.com" 
                            className="border-gray-300 focus:border-circa-green focus:ring-circa-green/20"
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
                          <FormLabel className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            {t('common.password')}
                          </FormLabel>
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
                            className="border-gray-300 focus:border-circa-green focus:ring-circa-green/20"
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
                            className="data-[state=checked]:bg-circa-green data-[state=checked]:border-circa-green"
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
                    className="w-full bg-circa-green hover:bg-circa-green-dark text-white py-6"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {t('common.signingIn')}
                      </div>
                    ) : t('common.signIn')}
                  </Button>
                </form>
              </Form>

              <div className="mt-8 text-center border-t pt-6">
                <p className="text-sm text-gray-600">
                  {t('login.noAccount')} {' '}
                  <Link to="/auth/signup" className="text-circa-green font-medium hover:underline">
                    {t('common.signup')}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </main>

        <footer className="py-6 border-t">
          <div className="container text-center text-sm text-gray-500">
            <p>© {new Date().getFullYear()} Circa. {t('common.allRightsReserved')}</p>
          </div>
        </footer>
      </div>
    </>
  );
}
