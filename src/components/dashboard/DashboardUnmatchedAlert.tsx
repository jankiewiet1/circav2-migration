
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight } from "lucide-react";

interface DashboardUnmatchedAlertProps {
  unmatchedEntries: number;
}

export const DashboardUnmatchedAlert = ({ unmatchedEntries }: DashboardUnmatchedAlertProps) => {
  if (unmatchedEntries <= 0) return null;
  
  return (
    <Card className="mb-6 border-amber-300 bg-amber-50 shadow-amber-100/20">
      <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div className="flex items-start mb-3 sm:mb-0">
          <AlertCircle className="h-5 w-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-amber-800">Attention Required</h3>
            <p className="text-sm text-amber-700">
              You have <strong>{unmatchedEntries}</strong> unmatched emission entries. 
              Resolve them to improve your emissions coverage.
            </p>
          </div>
        </div>
        <Button asChild className="bg-amber-500 hover:bg-amber-600">
          <Link to="/emissions/overview">
            Resolve Now
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
