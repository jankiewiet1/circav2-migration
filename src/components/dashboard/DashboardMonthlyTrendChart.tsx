import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from 'react';

interface MonthlyTrendData {
  month: string; // e.g., "2023-10"
  total_monthly_emissions: number;
}

interface DashboardMonthlyTrendChartProps {
  data: MonthlyTrendData[];
  loading: boolean;
}

// Basic color palette for bars
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function DashboardMonthlyTrendChart({ data, loading }: DashboardMonthlyTrendChartProps) {
  const chartData = useMemo(() => {
    return (data || []).map((item, index) => ({
      name: item.month, // Use month as the name for the axis
      Emissions: item.total_monthly_emissions,
      fill: COLORS[index % COLORS.length], // Cycle through colors
    }));
  }, [data]);

  if (loading) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No monthly data available yet.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart 
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip 
            formatter={(value: number) => [`${value.toFixed(2)} tCO₂e`, "Emissions"]}
            labelFormatter={(label: string) => `Month: ${label}`}
          />
          <Legend />
          <Bar dataKey="Emissions" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 