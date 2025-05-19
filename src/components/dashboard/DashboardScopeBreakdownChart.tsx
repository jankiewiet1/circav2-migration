import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer } from "@/components/ui/chart";
import { PieChart as PieChartIcon, BarChart as BarChartIcon } from "lucide-react";
import { 
  ResponsiveContainer, BarChart as RechartsBarChart, PieChart as RechartsPieChart, 
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Pie, Cell 
} from "recharts";

interface ScopeData { // Simplified data structure
  scope: string; // e.g., "Scope 1", "Scope 2"
  value: number; // Total emissions for the scope
}

interface DashboardScopeBreakdownChartProps {
  data: ScopeData[];
  loading: boolean;
}

// Define colors for scopes - ensure consistency or make dynamic if needed
const SCOPE_COLORS = {
  'Scope 1': '#0E5D40', 
  'Scope 2': '#6ED0AA',
  'Scope 3': '#AAE3CA',
  'default': '#cccccc' // Fallback color
};

export function DashboardScopeBreakdownChart({ data, loading }: DashboardScopeBreakdownChartProps) {
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

  const totalEmissions = data.reduce((sum, d) => sum + d.value, 0);

  const chartData = data.map(item => ({
    name: item.scope,
    value: item.value,
    // Calculate percentage for Pie chart tooltips/labels if needed
    percentage: totalEmissions > 0 ? ((item.value / totalEmissions) * 100).toFixed(1) : 0,
    // Assign fill color based on scope name
    fill: SCOPE_COLORS[item.scope as keyof typeof SCOPE_COLORS] || SCOPE_COLORS['default'] 
  }));

  if (loading) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <Skeleton className="h-[250px] w-full rounded-lg" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No emission data available by scope yet.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-end mb-4">
        <div className="bg-gray-100 rounded-md p-1 flex">
          <Button
            variant={chartType === 'bar' ? "secondary" : "ghost"} // Use secondary for active
            size="sm"
            onClick={() => setChartType('bar')}
            className={chartType === 'bar' ? "bg-muted" : ""}
          >
            <BarChartIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={chartType === 'pie' ? "secondary" : "ghost"} // Use secondary for active
            size="sm"
            onClick={() => setChartType('pie')}
            className={chartType === 'pie' ? "bg-muted" : ""}
          >
            <PieChartIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="h-[300px]">
        {/* We can use ShadCN ChartContainer potentially, but direct Recharts is simpler here */} 
        {chartType === 'bar' ? (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis unit=" tCO₂e" width={80}/> {/* Added width for YAxis */} 
              <Tooltip formatter={(value: number) => [`${value.toFixed(2)} tCO₂e`, "Emissions"]} />
              {/* <Legend /> Optional */}
              <Bar dataKey="value" name="Emissions">
                 {chartData.map((entry, index) => (
                   <Cell key={`cell-${index}`} fill={entry.fill} />
                 ))}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8" // Default fill, overridden by Cell
                dataKey="value"
                label={({ name, percentage }) => `${name}: ${percentage}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(2)} tCO₂e (${chartData.find(d=>d.name===name)?.percentage}%) `, name]} />
              <Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
} 