
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UploadCloud, RefreshCw, FileText } from "lucide-react";

interface DashboardQuickActionsProps {
  isMobile: boolean;
}

export const DashboardQuickActions = ({ isMobile }: DashboardQuickActionsProps) => {
  return (
    <div className={`grid grid-cols-${isMobile ? '1' : '3'} gap-4 mb-6`}>
      <Card className="bg-circa-green/5 border-circa-green/20 hover:bg-circa-green/10 transition-colors">
        <Link to="/data-upload">
          <CardContent className="flex items-center p-4 cursor-pointer">
            <UploadCloud className="h-6 w-6 text-circa-green mr-3" />
            <div>
              <h3 className="font-semibold">Upload New Data</h3>
              <p className="text-xs text-gray-500">Add new emissions data to the system</p>
            </div>
          </CardContent>
        </Link>
      </Card>
      
      <Card className="bg-circa-green/5 border-circa-green/20 hover:bg-circa-green/10 transition-colors">
        <Link to="/emissions/overview">
          <CardContent className="flex items-center p-4 cursor-pointer">
            <RefreshCw className="h-6 w-6 text-circa-green mr-3" />
            <div>
              <h3 className="font-semibold">Recalculate Emissions</h3>
              <p className="text-xs text-gray-500">Update calculations with latest factors</p>
            </div>
          </CardContent>
        </Link>
      </Card>
      
      <Card className="bg-circa-green/5 border-circa-green/20 hover:bg-circa-green/10 transition-colors">
        <Link to="/reports">
          <CardContent className="flex items-center p-4 cursor-pointer">
            <FileText className="h-6 w-6 text-circa-green mr-3" />
            <div>
              <h3 className="font-semibold">View Reports</h3>
              <p className="text-xs text-gray-500">Analyze and export detailed reports</p>
            </div>
          </CardContent>
        </Link>
      </Card>
    </div>
  );
};
