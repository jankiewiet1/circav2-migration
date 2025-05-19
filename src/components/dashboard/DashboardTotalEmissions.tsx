
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown, Flame } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, Tooltip } from "recharts";

interface DashboardTotalEmissionsProps {
  totalEmissions: number;
  loading: boolean;
}

export const DashboardTotalEmissions = ({ totalEmissions, loading }: DashboardTotalEmissionsProps) => {
  const [showKg, setShowKg] = useState(false);
  const isIncreasing = true; // This would come from actual data
  const changePercentage = 12.5; // This would come from actual data
  
  // Mock data for the sparkline
  const sparklineData = [
    { month: "Jan", value: 400 },
    { month: "Feb", value: 430 },
    { month: "Mar", value: 420 },
    { month: "Apr", value: 450 },
    { month: "May", value: 470 },
    { month: "Jun", value: 490 },
    { month: "Jul", value: 500 },
    { month: "Aug", value: 510 },
    { month: "Sep", value: 520 },
    { month: "Oct", value: 530 },
    { month: "Nov", value: 540 },
    { month: "Dec", value: totalEmissions }
  ];

  const displayValue = showKg 
    ? (totalEmissions * 1000).toLocaleString() 
    : totalEmissions.toLocaleString();
    
  const unit = showKg ? "kg CO₂e" : "t CO₂e";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">Total Emissions</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-baseline space-x-1 cursor-pointer" 
                     onClick={() => setShowKg(!showKg)}>
                  <span className="text-3xl font-bold transition-all duration-300">
                    {displayValue}
                  </span>
                  <span className="text-gray-500 mb-1">{unit}</span>
                </div>
                <div className="flex items-center mt-1">
                  {isIncreasing ? (
                    <div className="text-red-500 flex items-center text-xs">
                      <ArrowUp className="mr-1 h-3 w-3" />
                      {changePercentage}% from last month
                    </div>
                  ) : (
                    <div className="text-green-500 flex items-center text-xs">
                      <ArrowDown className="mr-1 h-3 w-3" />
                      {changePercentage}% from last month
                    </div>
                  )}
                </div>
              </div>
              <Flame className="h-6 w-6 text-orange-500" />
            </div>
            
            <div className="h-16 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Tooltip 
                    formatter={(value) => [`${value} ${unit}`, "Emissions"]}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#0E5D40" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-gray-500 mt-1 text-center">
              Last 12 months trend
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
