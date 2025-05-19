import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer } from "@/components/ui/chart";
import { PieChart, BarChart as BarChartIcon } from "lucide-react";
import { 
  ResponsiveContainer, BarChart as RechartsBarChart, PieChart as RechartsPieChart, 
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Pie, Cell 
} from "recharts";

export interface EmissionsData {
  scope: string;
  value: number;
  unit: string;
  date: string;
}

interface DashboardEmissionsChartProps {
  emissionsData: EmissionsData[];
  loading: boolean;
}

export const DashboardEmissionsChart = ({ emissionsData, loading }: DashboardEmissionsChartProps) => {
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  
  const COLORS = ['#0E5D40', '#6ED0AA', '#AAE3CA'];
  
  const pieData = emissionsData.map(item => ({
    name: item.scope,
    value: item.value,
    percentage: (item.value / emissionsData.reduce((sum, d) => sum + d.value, 0) * 100).toFixed(1)
  }));

  if (loading) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <div className="space-y-4 w-full">
          <Skeleton className="h-[250px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-end mb-4">
        <div className="bg-gray-100 rounded-md p-1 flex">
          <Button
            variant={chartType === 'bar' ? "default" : "ghost"}
            size="sm"
            onClick={() => setChartType('bar')}
            className={chartType === 'bar' ? "bg-circa-green hover:bg-circa-green-dark" : ""}
          >
            <BarChartIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={chartType === 'pie' ? "default" : "ghost"}
            size="sm"
            onClick={() => setChartType('pie')}
            className={chartType === 'pie' ? "bg-circa-green hover:bg-circa-green-dark" : ""}
          >
            <PieChart className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="h-[300px]">
        <ChartContainer config={{
          "Scope 1": { color: COLORS[0] },
          "Scope 2": { color: COLORS[1] },
          "Scope 3": { color: COLORS[2] }
        }}>
          {chartType === 'bar' ? (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={emissionsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="scope" />
                <YAxis unit=" tCO2e" />
                <Tooltip formatter={(value) => [`${value} tCO2e`, "Emissions"]} />
                <Legend />
                <Bar dataKey="value" name="Emissions" fill="#0E5D40" />
              </RechartsBarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} tCO2e`, "Emissions"]} />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>
      </div>
    </div>
  );
};
