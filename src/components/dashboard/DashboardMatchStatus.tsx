import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, ArrowRight } from "lucide-react";

interface DashboardMatchStatusProps {
  matched: number;
  unmatched: number;
  total: number;
  loading: boolean;
}

export const DashboardMatchStatus = ({ 
  matched, 
  unmatched, 
  total,
  loading 
}: DashboardMatchStatusProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Emission Entry Status
          </CardTitle>
          <Skeleton className="h-4 w-3/4 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full mb-4" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  // If no entries at all
  if (total === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Emission Entry Status
          </CardTitle>
          <CardDescription>Match status of emission entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>No emission entries yet</p>
            <Button asChild className="mt-4" variant="outline">
              <Link to="/emissions/overview">
                Add Entries
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const matchedPercentage = total > 0 ? Math.round((matched / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Emission Entry Status
        </CardTitle>
        <CardDescription>Match status of emission entries</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Match Rate</span>
            <span className="text-sm font-medium">{matchedPercentage}%</span>
          </div>
          <Progress value={matchedPercentage} className="h-2" />
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="flex flex-col items-center p-3 bg-green-50 rounded-md">
              <CheckCircle className="h-5 w-5 text-green-500 mb-1" />
              <span className="text-lg font-bold text-green-700">{matched}</span>
              <span className="text-xs text-green-600">Matched Entries</span>
            </div>
            
            <div className="flex flex-col items-center p-3 bg-amber-50 rounded-md">
              <XCircle className="h-5 w-5 text-amber-500 mb-1" />
              <span className="text-lg font-bold text-amber-700">{unmatched}</span>
              <span className="text-xs text-amber-600">Unmatched Entries</span>
            </div>
          </div>
          
          {unmatched > 0 && (
            <Button asChild className="w-full mt-3" variant="outline">
              <Link to="/emissions/overview">
                Resolve Unmatched Entries
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 