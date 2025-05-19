import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, session, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const from = (location.state as any)?.from?.pathname || "/dashboard";

  // Watch for session changes
  useEffect(() => {
    if (session && !authLoading) {
      console.log("Session detected, navigating to:", from);
      navigate(from, { replace: true });
    }
  }, [session, authLoading, navigate, from]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await signIn(email, password, rememberMe);
      
      if (error) {
        console.error("Login error:", error);
        setError(error.message || "An error occurred during login");
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <Helmet>
        <title>{t('login.pageTitle')} | Circa</title>
        <meta name="description" content={t('login.pageDescription')} />
      </Helmet>

      <div className="flex min-h-screen flex-col">
        <header className="border-b py-4">
          <div className="container flex items-center justify-between">
            <Link to="/">
              <img src="/logo.svg" alt="Circa" className="h-8" />
            </Link>
            <Button variant="ghost" asChild>
              <Link to="/auth/signup">{t('common.signup')}</Link>
            </Button>
          </div>
        </header>

        <main className="flex-1 container py-12">
          <div className="max-w-md mx-auto">
            <div className="mb-12 text-center">
              <h1 className="text-3xl font-bold tracking-tight mb-3">
                {t('login.title')}
              </h1>
              <p className="text-lg text-gray-600">
                {t('login.subtitle')}
              </p>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>{t('login.welcomeBack')}</CardTitle>
                <CardDescription>{t('login.enterCredentials')}</CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('common.email')}</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="you@example.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">{t('common.password')}</Label>
                      <Link to="/auth/reset-password" className="text-xs text-primary hover:underline">
                        {t('login.forgotPassword')}
                      </Link>
                    </div>
                    <Input 
                      id="password" 
                      type="password"
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember-me" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                    />
                    <Label 
                      htmlFor="remember-me" 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {t('login.rememberMe')}
                    </Label>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || authLoading}
                  >
                    {(loading || authLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('login.signIn')}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="flex justify-center border-t pt-6">
                <Button variant="ghost" asChild>
                  <Link to="/auth/signup">
                    {t('login.noAccount')} {t('common.signup')}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
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
