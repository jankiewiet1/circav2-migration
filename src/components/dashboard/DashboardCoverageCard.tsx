
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart2 } from "lucide-react";

interface DashboardCoverageCardProps {
  coveragePercentage: number;
  loading: boolean;
  unmatchedEntries: number;
  totalEntries: number;
}

export const DashboardCoverageCard = ({ 
  coveragePercentage, 
  loading, 
  unmatchedEntries,
  totalEntries
}: DashboardCoverageCardProps) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">Emissions Coverage</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline space-x-1">
                <span className="text-3xl font-bold">{coveragePercentage}</span>
                <span className="text-gray-500 mb-1">%</span>
              </div>
              <BarChart2 className="h-6 w-6 text-circa-green" />
            </div>
            
            <div className="mt-3 space-y-2">
              <Progress 
                value={coveragePercentage} 
                className="h-2"
                // Custom colors based on percentage
                style={{
                  background: coveragePercentage < 50 ? "#FEF7CD" : "#F2FCE2",
                  "--progress-background": coveragePercentage < 50 ? "#F97316" : "#0E5D40"
                } as React.CSSProperties}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{totalEntries - unmatchedEntries} matched</span>
                <span>{unmatchedEntries} unmatched</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
