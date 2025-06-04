import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Tooltip } from 'recharts';
import { Flame, BarChart2, Calendar, AlertCircle, RefreshCw, Loader2, Activity, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { ChartContainer } from '@/components/ui/chart';
import { EmissionEntryWithCalculation } from '@/hooks/useScopeEntries';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useScopeEntries } from '@/hooks/useScopeEntries';

const COLORS = ['#0E5D40', '#6ED0AA', '#AAE3CA', '#D6F3E7'];

interface EmissionCalculation {
  entry_id: string;
  total_emissions: number;
  calculation_method: string;
  scope: number;
}

interface EmissionEntryWithCalculation {
  id: string;
  category: string;
  quantity: number;
  unit: string;
  scope: number;
  date: string;
  emission_calc: EmissionCalculation[];
}

const getCalculatedEmissions = (entry: EmissionEntryWithCalculation): number => {
  if (entry.emission_calc && entry.emission_calc.length > 0) {
    return entry.emission_calc[0]?.total_emissions ?? 0;
  }
  return 0;
};

interface Scope1DashboardProps {
  className?: string;
}

const Scope1Dashboard: React.FC<Scope1DashboardProps> = ({ className }) => {
  const { entries, loading, error } = useScopeEntries(1);

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
    return <div className={className}>Loading Scope 1 data...</div>;
  }

  if (error) {
    return <div className={className}>Error loading Scope 1 data: {error}</div>;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Scope 1 Emissions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scope 1 Emissions</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewData.totalEmissions}</div>
            <p className="text-xs text-muted-foreground">kg CO₂e</p>
          </CardContent>
        </Card>

        {/* Top Category */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Category</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewData.topCategory}</div>
            <p className="text-xs text-muted-foreground">Highest emissions</p>
          </CardContent>
        </Card>

        {/* Total Activities */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entries?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Tracked activities</p>
          </CardContent>
        </Card>
      </div>

      {/* Emissions Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Scope 1 Emissions Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={overviewData.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="emissions" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Scope 1 Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {entries?.slice(0, 5).map((entry) => {
              const calculation = entry.emission_calc && entry.emission_calc.length > 0
                ? entry.emission_calc[0]
                : null;
              return (
                <div key={entry.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="font-medium">{entry.category}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.quantity} {entry.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {calculation ? `${calculation.total_emissions.toFixed(2)} kg CO₂e` : 'Not calculated'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {calculation?.calculation_method || 'No calculation'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Scope1Dashboard; 