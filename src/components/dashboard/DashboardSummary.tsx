import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

export const DashboardSummary = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card className="bg-gradient-to-br from-blue-50 to-green-50 border-blue-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center text-blue-700">
            <Calculator className="h-5 w-5 mr-2" />
            Climatiq Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-700 mb-3">
            Use our new Climatiq-powered calculator to easily track your emissions
          </p>
          <div className="flex justify-between items-center">
            <Button asChild variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
              <Link to="/emissions/calculate">
                Try Calculator
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-blue-500">
              <a href="https://www.climatiq.io" target="_blank" rel="noopener noreferrer" className="flex items-center">
                <span className="text-xs">Learn More</span>
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 