
import { Card, CardContent } from "@/components/ui/card";
import { FileText, TrendingUp, BookOpen } from "lucide-react";

interface ReportSummaryProps {
  totalReports: number;
  commonType: string;
  yearChange: number;
}

export const ReportSummary = ({ totalReports, commonType, yearChange }: ReportSummaryProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <FileText className="h-5 w-5 text-circa-green" />
            <div>
              <p className="text-sm text-muted-foreground">Total Reports</p>
              <h3 className="text-2xl font-bold">{totalReports}</h3>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <BookOpen className="h-5 w-5 text-circa-green" />
            <div>
              <p className="text-sm text-muted-foreground">Most Common Type</p>
              <h3 className="text-2xl font-bold">{commonType}</h3>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <TrendingUp className="h-5 w-5 text-circa-green" />
            <div>
              <p className="text-sm text-muted-foreground">Year-over-Year</p>
              <h3 className="text-2xl font-bold">
                {yearChange > 0 ? "+" : ""}{yearChange}%
              </h3>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
