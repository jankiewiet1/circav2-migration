import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Zap, BarChart2, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ChartContainer } from '@/components/ui/chart';
import { EmissionEntryWithCalculation } from '@/hooks/useScopeEntries';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const COLORS = ['#0E5D40', '#6ED0AA', '#AAE3CA', '#D6F3E7'];

interface Scope2DashboardProps {
  entries: EmissionEntryWithCalculation[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const getCalculatedEmissions = (entry: EmissionEntryWithCalculation): number => {
  if (entry.emission_calc && entry.emission_calc.length > 0) {
    return entry.emission_calc[0]?.total_emissions ?? 0;
  }
  return 0;
};

export const Scope2Dashboard = ({ entries, loading, error, refetch }: Scope2DashboardProps) => {
  const overviewData = useMemo(() => {
    if (loading || !entries || entries.length === 0) {
      return { 
        totalEmissions: 0, 
        monthlyData: [], 
        topCategory: 'N/A', 
        lastDate: null,
        energyTypeBreakdown: []
      };
    }

    let totalEmissions = 0;
    const emissionsByMonth: Record<string, number> = {};
    const categoryEmissions: Record<string, number> = {};
    const energyTypeEmissions: Record<string, number> = {}; // For Scope 2: tracking by energy type
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
      
      // Extract energy type from description or category for Scope 2
      const energyType = 
        entry.category?.toLowerCase().includes('electricity') ? 'Electricity' :
        entry.category?.toLowerCase().includes('steam') ? 'Steam' : 
        entry.category?.toLowerCase().includes('heating') ? 'Heating' :
        entry.category?.toLowerCase().includes('cooling') ? 'Cooling' : 'Other';
        
      energyTypeEmissions[energyType] = (energyTypeEmissions[energyType] || 0) + emissions;
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
    
    // Create energy type breakdown for Scope 2
    const energyTypeBreakdown = Object.entries(energyTypeEmissions)
      .map(([type, value]) => ({
        name: type,
        value: parseFloat(value.toFixed(2)),
        percentage: parseFloat(((value / totalEmissions) * 100).toFixed(1))
      }))
      .sort((a, b) => b.value - a.value);

    return {
      totalEmissions: parseFloat(totalEmissions.toFixed(2)),
      monthlyData,
      topCategory,
      lastDate,
      energyTypeBreakdown
    };

  }, [entries, loading]);

  if (error) {
     return (
      <Alert variant="destructive" className="my-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Scope 2 Overview</AlertTitle>
        <AlertDescription>
          {error || "An unexpected error occurred."}
          <Button variant="secondary" size="sm" onClick={refetch} className="ml-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Scope 2 Emissions</CardTitle>
            <CardDescription>Year to date (tCO₂e)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-3/4" />
            ) : (
            <div className="flex items-center">
              <Zap className="mr-2 h-4 w-4 text-yellow-500" />
              <span className="text-2xl font-bold">{overviewData.totalEmissions}</span>
            </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Top Energy Source</CardTitle>
            <CardDescription>Highest CO₂e contributor within Scope 2</CardDescription>
          </CardHeader>
          <CardContent>
             {loading ? (
              <Skeleton className="h-8 w-3/4" />
            ) : (
            <div className="flex items-center">
              <BarChart2 className="mr-2 h-4 w-4 text-circa-green" />
              <span className="text-xl font-bold capitalize truncate" title={overviewData.topCategory}>{overviewData.topCategory}</span>
            </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Last Entry Date</CardTitle>
            <CardDescription>Most recent Scope 2 entry</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-3/4" />
            ) : (
            <div className="flex items-center">
              <Calendar className="mr-2 h-4 w-4 text-circa-green" />
              <span className="text-xl font-bold">
                {overviewData.lastDate ? format(overviewData.lastDate, 'dd MMM yyyy') : 'No data'}
              </span>
            </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Emissions Trend</CardTitle>
          <CardDescription>Scope 2 emissions over time (tCO₂e)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {loading ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : overviewData.monthlyData.length > 0 ? (
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
                    <Bar dataKey="emissions" name="Scope 2 Emissions" fill={COLORS[0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No monthly data available</div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Energy Type Breakdown for Scope 2 */}
      <Card>
        <CardHeader>
          <CardTitle>Emissions by Energy Type</CardTitle>
          <CardDescription>Distribution of emissions by energy source</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {loading ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : overviewData.energyTypeBreakdown && overviewData.energyTypeBreakdown.length > 0 ? (
              <div className="flex h-full">
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={overviewData.energyTypeBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={2}
                        dataKey="value"
                        label={({name, percentage}) => `${name}: ${percentage}%`}
                      >
                        {overviewData.energyTypeBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend formatter={(value, entry) => {
                        // Type assertion for payload
                        const payload = entry?.payload as any;
                        return payload?.name || '';
                      }} />
                      <RechartsTooltip 
                        formatter={(value: number, name: string, props: any) => {
                          return [`${value.toFixed(2)} tCO₂e (${props.payload.percentage}%)`, props.payload.name];
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No energy type data available</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 