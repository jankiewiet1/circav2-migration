import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Flame, BarChart2, Calendar, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ChartContainer } from '@/components/ui/chart';
import { EmissionEntryWithCalculation } from '@/hooks/useScopeEntries';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useScopeEntries } from '@/hooks/useScopeEntries';

const COLORS = ['#0E5D40', '#6ED0AA', '#AAE3CA', '#D6F3E7'];

interface EmissionsOverviewDashboardProps {
  scope: 1 | 2 | 3;
  title: string;
}

const getCalculatedEmissions = (entry: EmissionEntryWithCalculation): number => {
  if (entry.emission_calc && entry.emission_calc.length > 0) {
    return entry.emission_calc[0]?.total_emissions ?? 0;
  }
  return 0;
};

const EmissionsOverviewDashboard: React.FC<EmissionsOverviewDashboardProps> = ({ scope, title }) => {
  const { entries, loading, error } = useScopeEntries(scope);

  const overviewData = useMemo(() => {
    if (loading || !entries || entries.length === 0) {
      return { totalEmissions: 0, monthlyData: [], topCategory: 'N/A', lastDate: null };
    }

    let totalEmissions = 0;
    const emissionsByMonth: Record<string, number> = {};
    const categoryEmissions: Record<string, number> = {};
    let lastDate: Date | null = null;

    entries.forEach(entry => {
      const emissions = getCalculatedEmissions(entry);
      totalEmissions += emissions;

      if (entry.date) {
        const entryDate = new Date(entry.date);
        if (!isNaN(entryDate.getTime())) {
          const month = entry.date.substring(0, 7);
          emissionsByMonth[month] = (emissionsByMonth[month] || 0) + emissions;
          if (!lastDate || entryDate > lastDate) {
            lastDate = entryDate;
          }
        }
      }
      
      const cat = entry.category || 'Unknown';
      categoryEmissions[cat] = (categoryEmissions[cat] || 0) + emissions;
    });

    const sortedMonths = Object.keys(emissionsByMonth).sort();
    const monthlyData = sortedMonths.map(month => ({
      name: format(new Date(month + '-01T00:00:00'), 'MMM yyyy'),
      emissions: parseFloat(emissionsByMonth[month].toFixed(2))
    }));

    let maxEmissions = 0;
    let topCategory = 'N/A';
    Object.entries(categoryEmissions).forEach(([category, amount]) => {
      if (amount > maxEmissions) {
        maxEmissions = amount;
        topCategory = category;
      }
    });

    return {
      totalEmissions: parseFloat(totalEmissions.toFixed(2)),
      monthlyData,
      topCategory,
      lastDate
    };

  }, [entries, loading]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Scope 1 Emissions</CardTitle>
            <CardDescription>Year to date (tCO₂e)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Flame className="mr-2 h-4 w-4 text-orange-500" />
              <span className="text-2xl font-bold">{overviewData.totalEmissions}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Top Emitting Category</CardTitle>
            <CardDescription>Highest CO₂e contributor within Scope 1</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <BarChart2 className="mr-2 h-4 w-4 text-circa-green" />
              <span className="text-xl font-bold capitalize truncate" title={overviewData.topCategory}>{overviewData.topCategory}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Last Entry Date</CardTitle>
            <CardDescription>Most recent Scope 1 entry</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Calendar className="mr-2 h-4 w-4 text-circa-green" />
              <span className="text-xl font-bold">
                {overviewData.lastDate ? format(overviewData.lastDate, 'dd MMM yyyy') : 'No data'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Emissions Trend</CardTitle>
          <CardDescription>Scope 1 emissions over time (tCO₂e)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {overviewData.monthlyData.length > 0 ? (
              <ChartContainer config={{ "emissions": { color: COLORS[0] } }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overviewData.monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis width={60}/>
                    <RechartsTooltip formatter={(value: number | string) => {
                      const numValue = typeof value === 'number' ? value : parseFloat(value);
                      return [`${numValue.toFixed(2)} tCO₂e`, 'Emissions'];
                    }} />
                    <Bar dataKey="emissions" name="Scope 1 Emissions" fill={COLORS[0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No monthly data available</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmissionsOverviewDashboard;
