import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Flame, BarChart2, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ChartContainer } from '@/components/ui/chart';
import { EmissionEntryWithCalculation } from '@/hooks/useScopeEntries';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const COLORS = ['#0E5D40', '#6ED0AA', '#AAE3CA', '#D6F3E7'];

interface Scope1DashboardProps {
  entries: EmissionEntryWithCalculation[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const getCalculatedEmissions = (entry: EmissionEntryWithCalculation): number => {
  if (entry.emission_calc_climatiq && entry.emission_calc_climatiq.length > 0) {
    return entry.emission_calc_climatiq[0]?.total_emissions ?? 0;
  }
  return 0;
};

export const Scope1Dashboard = ({ entries, loading, error, refetch }: Scope1DashboardProps) => {
  const overviewData = useMemo(() => {
    if (loading || !entries || entries.length === 0) {
      return { totalEmissions: 0, monthlyData: [], topCategory: 'N/A', lastDate: null };
    }

    let totalEmissions = 0;
    const emissionsByMonth: Record<string, number> = {};
    const categoryEmissions: Record<string, number> = {};
    const facilityEmissions: Record<string, number> = {}; // For Scope 1: tracking by facility
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
      
      // Extract facility from description or notes for Scope 1
      const facility = entry.notes?.match(/Facility: ([^,]+)/)?.[1] || 'Unspecified';
      facilityEmissions[facility] = (facilityEmissions[facility] || 0) + emissions;
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
    
    // Create facility breakdown for Scope 1
    const facilityBreakdown = Object.entries(facilityEmissions)
      .map(([facility, value]) => ({
        name: facility,
        value: parseFloat(value.toFixed(2)),
        percentage: parseFloat(((value / totalEmissions) * 100).toFixed(1))
      }))
      .sort((a, b) => b.value - a.value);

    return {
      totalEmissions: parseFloat(totalEmissions.toFixed(2)),
      monthlyData,
      topCategory,
      lastDate,
      facilityBreakdown
    };

  }, [entries, loading]);

  if (error) {
     return (
      <Alert variant="destructive" className="my-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Scope 1 Overview</AlertTitle>
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
            <CardTitle className="text-lg">Total Scope 1 Emissions</CardTitle>
            <CardDescription>Year to date (tCO₂e)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-3/4" />
            ) : (
            <div className="flex items-center">
              <Flame className="mr-2 h-4 w-4 text-orange-500" />
              <span className="text-2xl font-bold">{overviewData.totalEmissions}</span>
            </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Top Emitting Category</CardTitle>
            <CardDescription>Highest CO₂e contributor within Scope 1</CardDescription>
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
            <CardDescription>Most recent Scope 1 entry</CardDescription>
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
          <CardDescription>Scope 1 emissions over time (tCO₂e)</CardDescription>
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
      
      {/* Facility Breakdown for Scope 1 */}
      <Card>
        <CardHeader>
          <CardTitle>Emissions by Facility</CardTitle>
          <CardDescription>Distribution of emissions across company facilities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {loading ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : overviewData.facilityBreakdown && overviewData.facilityBreakdown.length > 0 ? (
              <div className="flex h-full">
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={overviewData.facilityBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={2}
                        dataKey="value"
                        label={({name, percentage}) => `${name}: ${percentage}%`}
                      >
                        {overviewData.facilityBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend formatter={(value, entry) => entry?.payload?.name || ''} />
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
              <div className="flex items-center justify-center h-full text-muted-foreground">No facility data available</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 