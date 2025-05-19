import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendlyEmbed } from "@/components/booking/CalendlyEmbed";
import { Link, useSearchParams } from 'react-router-dom';

export default function SuccessPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const firstName = searchParams.get('firstName');
  const lastName = searchParams.get('lastName');

  return (
    <div className="container flex min-h-screen w-full flex-col items-center justify-center py-10">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Welcome to Circa! 🌱</CardTitle>
          <CardDescription>
            Thank you for joining us in making carbon accounting simple and effective.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Next Steps:</h3>
            
            <div className="space-y-2">
              <h4 className="font-medium">1. Confirm Your Email</h4>
              <p className="text-sm text-muted-foreground">
                We've sent you a confirmation email. Please click the link to verify your account.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">2. Book Your Onboarding Call</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Let us show you how Circa can help your organization track and reduce its carbon footprint.
              </p>
              <div className="rounded-lg border bg-card overflow-hidden h-[750px]">
                <CalendlyEmbed 
                  url="https://calendly.com/circa-info"
                  prefill={{
                    email,
                    firstName,
                    lastName
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">3. Explore the Dashboard</h4>
              <p className="text-sm text-muted-foreground">
                Once your email is confirmed, you can start exploring your carbon accounting dashboard.
              </p>
              <Button variant="outline" asChild>
                <Link to="/dashboard" className="mt-2">
                  Go to Dashboard
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Need help? Contact us at <a href="mailto:info@circa.site" className="text-primary hover:underline">info@circa.site</a></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 