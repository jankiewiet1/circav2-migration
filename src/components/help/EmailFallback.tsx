
import { useState } from "react";
import { Mail, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const EmailFallback = () => {
  const [copied, setCopied] = useState(false);
  const email = "info@epccommodities.com";

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    toast.success("Email copied to clipboard");
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <Card className="shadow-md h-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Mail className="h-5 w-5 mr-2" />
          Still need help?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          Can't find what you're looking for? Email us directly.
        </p>
        <div className="bg-accent/50 rounded-md flex items-center justify-between p-2">
          <span className="font-medium text-sm">{email}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`
              ${copied ? "text-green-600" : "text-muted-foreground"} 
              hover:bg-accent hover:text-foreground
            `}
            onClick={handleCopyEmail}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span className="sr-only">{copied ? "Copied" : "Copy Email"}</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Support responds within 24 hours on business days.
        </p>
      </CardContent>
    </Card>
  );
};
