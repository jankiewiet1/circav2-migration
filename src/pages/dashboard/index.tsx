import { useState, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell 
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format, subMonths, isAfter } from "date-fns";
import { 
  ArrowUp, ArrowDown, CalendarIcon, BarChart2, PieChart as PieChartIcon, 
  AreaChart as AreaChartIcon, Target, Clock 
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DateRange } from "react-day-picker";
import { useDashboardData, DashboardFilters } from "@/hooks/useDashboardData";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardMatchStatus } from '@/components/dashboard/DashboardMatchStatus';
import { useEntryMatchStatus } from '@/hooks/useEntryMatchStatus';

// Colors for charts
const COLORS = ["#0E5D40", "#6ED0AA", "#AAE3CA", "#D6F3E7"];
const SCOPE_COLORS = {
  "Scope 1": "#0E5D40",
  "Scope 2": "#6ED0AA",
  "Scope 3": "#AAE3CA"
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { company, loading: companyLoading } = useCompany();
  
  // Filter states
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subMonths(new Date(), 24),
    to: new Date()
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [chartType, setChartType] = useState<'line' | 'area'>('line');
  
  // Dashboard filters
  const filters = useMemo<DashboardFilters>(() => ({
    dateRange: {
      from: dateRange.from || subMonths(new Date(), 24),
      to: dateRange.to || new Date()
    },
    scope: "all" // Always show all scopes
  }), [dateRange]);

  // Fetch dashboard data using the new hook
  const { data, loading, error } = useDashboardData(company?.id, filters);
  const { counts, loading: matchLoading } = useEntryMatchStatus(company?.id);
  
  // Format functions
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    }).format(num);
  };
  
  const formatEmissions = (num: number) => {
    return `${formatNumber(num)} tCO2e`;
  };
  
  const renderPercentChange = (change: number) => {
    if (change === 0) return <span className="text-gray-500">0% (no change)</span>;
    
    return change > 0 ? (
      <span className="text-red-500 flex items-center">
        <ArrowUp className="mr-1 h-4 w-4" />
        {Math.abs(change).toFixed(1)}% increase
      </span>
    ) : (
      <span className="text-green-500 flex items-center">
        <ArrowDown className="mr-1 h-4 w-4" />
        {Math.abs(change).toFixed(1)}% decrease
      </span>
    );
  };
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-sm">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatEmissions(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Callbacks for changing filters
  const handleDateRangeChange = useCallback((range: DateRange | undefined) => {
    if (range) {
      setDateRange(range);
    }
  }, []);
  
  const handleChartTypeChange = useCallback((type: 'line' | 'area') => {
    setChartType(type);
  }, []);

  // Add preset date ranges
  const handlePresetDateRange = useCallback((months: number) => {
    setDateRange({
      from: subMonths(new Date(), months),
      to: new Date()
    });
  }, []);

  // Filter out null or undefined scope values from breakdowns
  const filteredScopeBreakdown = data?.breakdowns.byScope
    .filter(item => item.scope && ["Scope 1", "Scope 2", "Scope 3"].includes(item.scope)) || [];

  // Show loading state
  if (companyLoading || loading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6 space-y-8">
          <div className="flex justify-between">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-10 w-1/4" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
          <Skeleton className="h-80" />
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Carbon Dashboard</h1>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handlePresetDateRange(3)}
              >
                3M
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handlePresetDateRange(6)}
              >
                6M
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handlePresetDateRange(12)}
              >
                1Y
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handlePresetDateRange(24)}
              >
                2Y
              </Button>
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex justify-start gap-2 min-w-[240px]">
                  <CalendarIcon className="h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                      </>
                    ) : (
                      format(dateRange.from, "MMM d, yyyy")
                    )
                  ) : (
                    "Select date range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-2 border-b flex justify-between items-center">
                  <div className="text-sm font-medium">Date Range</div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handlePresetDateRange(3)}
                      className="h-7 text-xs"
                    >
                      3M
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handlePresetDateRange(6)}
                      className="h-7 text-xs"
                    >
                      6M
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handlePresetDateRange(12)}
                      className="h-7 text-xs"
                    >
                      1Y
                    </Button>
                  </div>
                </div>
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={handleDateRangeChange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Monthly Emissions Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current Month Emissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                <div className="text-2xl font-bold">
                  {formatEmissions(data?.kpis.monthly.total || 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  vs. last year: {renderPercentChange(data?.kpis.monthly.percentChange || 0)}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-muted-foreground">Scope 1</span>
                    <span className="text-sm font-semibold">{formatEmissions(data?.kpis.monthly.scope1 || 0)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-muted-foreground">Scope 2</span>
                    <span className="text-sm font-semibold">{formatEmissions(data?.kpis.monthly.scope2 || 0)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-muted-foreground">Scope 3</span>
                    <span className="text-sm font-semibold">{formatEmissions(data?.kpis.monthly.scope3 || 0)}</span>
                  </div>
                </div>
                {/* Show latest entry info if available */}
                {data?.entries.latest && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Latest entry: <span className="font-medium">{data.entries.latest.date}</span> (Scope {data.entries.latest.scope})
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Quarterly Emissions Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current Quarter Emissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                <div className="text-2xl font-bold">
                  {formatEmissions(data?.kpis.quarterly.total || 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  vs. last year: {renderPercentChange(data?.kpis.quarterly.percentChange || 0)}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-muted-foreground">Scope 1</span>
                    <span className="text-sm font-semibold">{formatEmissions(data?.kpis.quarterly.scope1 || 0)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-muted-foreground">Scope 2</span>
                    <span className="text-sm font-semibold">{formatEmissions(data?.kpis.quarterly.scope2 || 0)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-muted-foreground">Scope 3</span>
                    <span className="text-sm font-semibold">{formatEmissions(data?.kpis.quarterly.scope3 || 0)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* YTD Emissions Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Year-to-Date Emissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                <div className="text-2xl font-bold">
                  {formatEmissions(data?.kpis.ytd.total || 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  vs. last year: {renderPercentChange(data?.kpis.ytd.percentChange || 0)}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-muted-foreground">Scope 1</span>
                    <span className="text-sm font-semibold">{formatEmissions(data?.kpis.ytd.scope1 || 0)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-muted-foreground">Scope 2</span>
                    <span className="text-sm font-semibold">{formatEmissions(data?.kpis.ytd.scope2 || 0)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-muted-foreground">Scope 3</span>
                    <span className="text-sm font-semibold">{formatEmissions(data?.kpis.ytd.scope3 || 0)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Charts & Target Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Emissions Over Time</CardTitle>
                <div className="flex space-x-2">
                  <Button 
                      variant={chartType === 'line' ? "default" : "outline"} 
                      size="icon" 
                      onClick={() => handleChartTypeChange('line')}
                  >
                    <BarChart2 className="h-4 w-4" />
                  </Button>
                  <Button 
                      variant={chartType === 'area' ? "default" : "outline"} 
                      size="icon" 
                      onClick={() => handleChartTypeChange('area')}
                  >
                    <AreaChartIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                Monthly emissions by scope over time
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {data && data.timeSeries.monthly.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'line' ? (
                    <LineChart
                      data={data.timeSeries.monthly}
                      margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        tickFormatter={(value) => format(new Date(value + "-01"), "MMM yyyy")}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tickFormatter={(value) => `${value} tCO2e`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="scope1" 
                        name="Scope 1" 
                        stroke={SCOPE_COLORS["Scope 1"]} 
                        strokeWidth={2} 
                        dot={{ r: 3 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="scope2" 
                        name="Scope 2" 
                        stroke={SCOPE_COLORS["Scope 2"]} 
                        strokeWidth={2} 
                        dot={{ r: 3 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="scope3" 
                        name="Scope 3" 
                        stroke={SCOPE_COLORS["Scope 3"]}
                        strokeWidth={2} 
                        dot={{ r: 3 }} 
                      />
                    </LineChart>
                  ) : (
                    <AreaChart
                      data={data.timeSeries.monthly}
                      margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        tickFormatter={(value) => format(new Date(value + "-01"), "MMM yyyy")}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tickFormatter={(value) => `${value} tCO2e`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="scope1" 
                        name="Scope 1" 
                        stackId="1" 
                        fill={SCOPE_COLORS["Scope 1"]} 
                        stroke={SCOPE_COLORS["Scope 1"]} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="scope2" 
                        name="Scope 2" 
                        stackId="1" 
                        fill={SCOPE_COLORS["Scope 2"]} 
                        stroke={SCOPE_COLORS["Scope 2"]} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="scope3" 
                        name="Scope 3" 
                        stackId="1"
                        fill={SCOPE_COLORS["Scope 3"]} 
                        stroke={SCOPE_COLORS["Scope 3"]} 
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">No emissions data available for the selected period</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emissions Target Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="mr-2 h-5 w-5" />
                Emission Reduction Target
              </CardTitle>
              <CardDescription>
                Progress towards {data?.targets.currentTarget || 0}% reduction by {data?.targets.targetYear || 2030}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Current Progress</span>
                  <span className="font-medium">{formatNumber(data?.targets.currentProgress || 0)}%</span>
                </div>
                <Progress value={data?.targets.currentProgress || 0} className="h-2" />
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Baseline Year</span>
                    <p className="font-medium">{data?.targets.baselineYear || 2022}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Baseline Emissions</span>
                    <p className="font-medium">{formatEmissions(data?.targets.baselineEmissions || 0)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Target Year</span>
                    <p className="font-medium">{data?.targets.targetYear || 2030}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Reduction Target</span>
                    <p className="font-medium">{data?.targets.currentTarget || 0}%</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 pt-4">
                <h4 className="text-sm font-medium">Scope Breakdown</h4>
                {filteredScopeBreakdown.length > 0 ? (
                  filteredScopeBreakdown.map((scope, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div 
                          className="h-3 w-3 rounded-full mr-2" 
                          style={{ backgroundColor: SCOPE_COLORS[scope.scope as keyof typeof SCOPE_COLORS] || '#888' }}
                        />
                        <span className="text-sm">{scope.scope}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{formatNumber(scope.value)} tCO2e</span>
                        <span className="text-xs text-muted-foreground">({formatNumber(scope.percentage)}%)</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-2 text-muted-foreground text-sm">No scope data available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
          
        {/* Match Status and Category Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DashboardMatchStatus matched={counts.matched} unmatched={counts.unmatched} total={counts.total} loading={matchLoading} />
          
          {/* Emissions by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Emissions by Category</CardTitle>
              <CardDescription>
                Breakdown of emissions by source category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {data && data.breakdowns.byCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.breakdowns.byCategory.sort((a, b) => b.value - a.value).slice(0, 10)}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => `${value} tCO2e`} />
                      <YAxis 
                        type="category" 
                        dataKey="category" 
                        width={90}
                        tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                      />
                      <Tooltip 
                        formatter={(value: any) => [`${formatNumber(value)} tCO2e`, 'Emissions']}
                        labelFormatter={(label) => `Category: ${label}`}
                      />
                      <Bar dataKey="value" fill="#0E5D40" name="Emissions" />
                    </BarChart>
                </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-muted-foreground">No category data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Emissions by Scope - Pie Chart */}
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChartIcon className="mr-2 h-5 w-5" />
                Emissions by Scope
              </CardTitle>
              <CardDescription>
                Distribution of emissions across scopes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center">
                {filteredScopeBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={filteredScopeBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={120}
                        fill="#0E5D40"
                        dataKey="value"
                        nameKey="scope"
                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      >
                        {filteredScopeBreakdown.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={SCOPE_COLORS[entry.scope as keyof typeof SCOPE_COLORS] || '#888'} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => [`${formatNumber(value)} tCO2e`, 'Emissions']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-muted-foreground">No scope data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
