import { useState, useMemo, useCallback, useEffect } from "react";
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
import { format, subMonths, subYears } from "date-fns";
import { 
  ArrowUp, ArrowDown, CalendarIcon, BarChart2, PieChart as PieChartIcon, 
  AreaChart as AreaChartIcon, Target, Clock, TrendingUp, TrendingDown,
  Filter, RefreshCw
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DateRange } from "react-day-picker";
import { useDashboardData, DashboardFilters } from "@/hooks/useDashboardData";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardMatchStatus } from '@/components/dashboard/DashboardMatchStatus';
import { useEntryMatchStatus } from '@/hooks/useEntryMatchStatus';
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

// Enhanced Colors for charts with Circa Green palette
const CIRCA_COLORS = ["#0E5D40", "#6ED0AA", "#AAE3CA", "#D6F3E7", "#85C2A6", "#4B8B6B"];
const SCOPE_COLORS = {
  "Scope 1": "#0E5D40",
  "Scope 2": "#6ED0AA", 
  "Scope 3": "#AAE3CA"
};

// Mock data for demonstration - in production this would come from your API
const mockEmissionsData = [
  { month: "Jan", "Scope 1": 2100, "Scope 2": 1200, "Scope 3": 3400, total: 6700 },
  { month: "Feb", "Scope 1": 1900, "Scope 2": 1100, "Scope 3": 3200, total: 6200 },
  { month: "Mar", "Scope 1": 2300, "Scope 2": 1300, "Scope 3": 3600, total: 7200 },
  { month: "Apr", "Scope 1": 2000, "Scope 2": 1150, "Scope 3": 3300, total: 6450 },
  { month: "May", "Scope 1": 1800, "Scope 2": 1000, "Scope 3": 2900, total: 5700 },
  { month: "Jun", "Scope 1": 2200, "Scope 2": 1250, "Scope 3": 3500, total: 6950 },
];

const mockCategoryData = [
  { category: "Employee Commute", emissions: 3500, percentage: 35 },
  { category: "Natural Gas", emissions: 2800, percentage: 28 },
  { category: "Business Travel", emissions: 1800, percentage: 18 },
  { category: "Electricity", emissions: 1200, percentage: 12 },
  { category: "Goods & Services", emissions: 700, percentage: 7 },
];

const mockScopeBreakdown = [
  { name: "Scope 1", value: 2223, percentage: 22.3 },
  { name: "Scope 2", value: 1566, percentage: 15.7 },
  { name: "Scope 3", value: 6158, percentage: 62.0 },
];

// Enhanced KPI Card Component
const KpiCard = ({ 
  title, 
  value, 
  unit, 
  change, 
  changeType, 
  breakdown, 
  lastUpdated, 
  sparklineData,
  target,
  isLoading = false 
}: {
  title: string;
  value: number;
  unit: string;
  change?: number;
  changeType?: 'increase' | 'decrease';
  breakdown?: { scope1: number; scope2: number; scope3: number };
  lastUpdated?: string;
  sparklineData?: number[];
  target?: { value: number; progress: number };
  isLoading?: boolean;
}) => {
  if (isLoading) {
    return (
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-8 w-1/2 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="relative overflow-hidden hover:shadow-lg transition-shadow bg-gradient-to-br from-white to-gray-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {value.toLocaleString()}
            </span>
            <span className="text-sm text-gray-500">{unit}</span>
          </div>
          
          {change && (
            <div className="flex items-center gap-1">
              {changeType === 'decrease' ? (
                <ArrowDown className="h-4 w-4 text-green-500" />
              ) : (
                <ArrowUp className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-sm font-medium ${
                changeType === 'decrease' ? 'text-green-600' : 'text-red-600'
              }`}>
                {Math.abs(change).toFixed(1)}% vs. last year
              </span>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          {breakdown && (
            <div className="space-y-2">
              <div className="text-xs text-gray-500 mb-2">Breakdown by Scope</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex flex-col">
                  <span className="text-gray-500">Scope 1</span>
                  <span className="font-semibold text-gray-800">{breakdown.scope1.toLocaleString()} tCO₂e</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500">Scope 2</span>
                  <span className="font-semibold text-gray-800">{breakdown.scope2.toLocaleString()} tCO₂e</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500">Scope 3</span>
                  <span className="font-semibold text-gray-800">{breakdown.scope3.toLocaleString()} tCO₂e</span>
                </div>
              </div>
            </div>
          )}
          
          {target && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress to Target</span>
                <span>{target.progress.toFixed(1)}%</span>
              </div>
              <Progress value={target.progress} className="h-2" />
            </div>
          )}
          
          {lastUpdated && (
            <div className="mt-3 text-xs text-gray-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Latest entry: {lastUpdated}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Enhanced Filter Bar Component
const FilterBar = ({ filters, onFiltersChange }: {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
}) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Helper function to calculate date range based on period
  const getDateRangeFromPeriod = useCallback((period: string) => {
    const now = new Date();
    let from: Date;
    
    switch (period) {
      case '3M':
        from = subMonths(now, 3);
        break;
      case '6M':
        from = subMonths(now, 6);
        break;
      case '1Y':
        from = subYears(now, 1);
        break;
      case '2Y':
        from = subYears(now, 2);
        break;
      default:
        from = subYears(now, 1);
    }
    
    return { from, to: now };
  }, []);

  // Handle period button clicks
  const handlePeriodClick = useCallback((period: string) => {
    const newDateRange = getDateRangeFromPeriod(period);
    onFiltersChange({ 
      ...filters, 
      period,
      dateRange: newDateRange 
    });
  }, [filters, onFiltersChange, getDateRangeFromPeriod]);

  // Handle custom date range selection
  const handleCustomDateRange = useCallback((range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      onFiltersChange({
        ...filters,
        period: 'custom',
        dateRange: { from: range.from, to: range.to }
      });
    }
  }, [filters, onFiltersChange]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white p-4 rounded-lg border shadow-sm mb-6"
    >
      <div className="flex flex-wrap gap-4 items-center">
        {/* Date Range Picker */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Period:</span>
          <div className="flex gap-1">
            {["3M", "6M", "1Y", "2Y"].map((period) => (
              <Button
                key={period}
                variant={filters.period === period ? "default" : "outline"}
                size="sm"
                onClick={() => handlePeriodClick(period)}
                className="h-8 px-3"
              >
                {period}
              </Button>
            ))}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant={filters.period === 'custom' ? "default" : "outline"} 
                size="sm" 
                className="h-8"
              >
                <CalendarIcon className="h-4 w-4 mr-1" />
                Custom
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={handleCustomDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Scope Toggles */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Scopes:</span>
          {[1, 2, 3].map((scope) => (
            <div key={scope} className="flex items-center space-x-2">
              <Checkbox
                id={`scope-${scope}`}
                checked={filters.scopes?.includes(scope) ?? true}
                onCheckedChange={(checked) => {
                  const currentScopes = filters.scopes || [1, 2, 3];
                  const newScopes = checked
                    ? [...currentScopes.filter(s => s !== scope), scope]
                    : currentScopes.filter(s => s !== scope);
                  onFiltersChange({ ...filters, scopes: newScopes });
                }}
              />
              <label htmlFor={`scope-${scope}`} className="text-sm">
                Scope {scope}
              </label>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// Enhanced Chart Components
const TimeSeriesChart = ({ data, type = 'line', filters }: { 
  data: any[]; 
  type?: 'line' | 'area';
  filters: DashboardFilters;
}) => {
  const ChartComponent = type === 'area' ? AreaChart : LineChart;
  
  // Filter data based on selected scopes
  const filteredData = useMemo(() => {
    if (!filters.scopes || filters.scopes.length === 0) return data;
    
    return data.map(item => {
      const filteredItem: any = { month: item.month };
      
      if (filters.scopes.includes(1)) {
        filteredItem["Scope 1"] = item["Scope 1"];
      }
      if (filters.scopes.includes(2)) {
        filteredItem["Scope 2"] = item["Scope 2"];
      }
      if (filters.scopes.includes(3)) {
        filteredItem["Scope 3"] = item["Scope 3"];
      }
      
      return filteredItem;
    });
  }, [data, filters.scopes]);
  
  return (
    <ResponsiveContainer width="100%" height={350}>
      <ChartComponent data={filteredData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="month" 
          tick={{ fontSize: 12 }}
          axisLine={{ stroke: '#e0e0e0' }}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          axisLine={{ stroke: '#e0e0e0' }}
          label={{ value: 'tCO₂e', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        />
        <Legend />
        {type === 'area' ? (
          <>
            {filters.scopes?.includes(1) && (
              <Area type="monotone" dataKey="Scope 1" stackId="1" stroke={SCOPE_COLORS["Scope 1"]} fill={SCOPE_COLORS["Scope 1"]} />
            )}
            {filters.scopes?.includes(2) && (
              <Area type="monotone" dataKey="Scope 2" stackId="1" stroke={SCOPE_COLORS["Scope 2"]} fill={SCOPE_COLORS["Scope 2"]} />
            )}
            {filters.scopes?.includes(3) && (
              <Area type="monotone" dataKey="Scope 3" stackId="1" stroke={SCOPE_COLORS["Scope 3"]} fill={SCOPE_COLORS["Scope 3"]} />
            )}
          </>
        ) : (
          <>
            {filters.scopes?.includes(1) && (
              <Line type="monotone" dataKey="Scope 1" stroke={SCOPE_COLORS["Scope 1"]} strokeWidth={2} />
            )}
            {filters.scopes?.includes(2) && (
              <Line type="monotone" dataKey="Scope 2" stroke={SCOPE_COLORS["Scope 2"]} strokeWidth={2} />
            )}
            {filters.scopes?.includes(3) && (
              <Line type="monotone" dataKey="Scope 3" stroke={SCOPE_COLORS["Scope 3"]} strokeWidth={2} />
            )}
          </>
        )}
      </ChartComponent>
    </ResponsiveContainer>
  );
};

const CategoryBarChart = ({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data} layout="horizontal">
      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
      <XAxis type="number" tick={{ fontSize: 12 }} />
      <YAxis 
        dataKey="category" 
        type="category" 
        tick={{ fontSize: 12 }}
        width={100}
      />
      <Tooltip 
        contentStyle={{ 
          backgroundColor: 'white', 
          border: '1px solid #e0e0e0',
          borderRadius: '8px'
        }}
      />
      <Bar dataKey="emissions" fill="#0E5D40" radius={[0, 4, 4, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

const ScopeDonutChart = ({ data, filters }: { data: any[]; filters: DashboardFilters }) => {
  // Filter data based on selected scopes
  const filteredData = useMemo(() => {
    if (!filters.scopes || filters.scopes.length === 0) return data;
    
    return data.filter(item => {
      const scopeNumber = parseInt(item.name.split(' ')[1]);
      return filters.scopes.includes(scopeNumber);
    });
  }, [data, filters.scopes]);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={filteredData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {filteredData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={SCOPE_COLORS[entry.name as keyof typeof SCOPE_COLORS]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const { company } = useCompany();
  const [chartType, setChartType] = useState<'line' | 'area'>('line');
  
  // Initialize filters with default values
  const [filters, setFilters] = useState<DashboardFilters>({
    period: '1Y',
    scopes: [1, 2, 3],
    categories: [],
    dateRange: {
      from: subYears(new Date(), 1),
      to: new Date()
    }
  });

  // Use real dashboard data with automatic updates
  const { data: dashboardData, loading: isLoading, error } = useDashboardData(company?.id, filters);
  
  // Get entry match status for data quality panel
  const { counts: matchCounts, loading: matchLoading } = useEntryMatchStatus(company?.id);

  const handleChartTypeChange = useCallback((type: 'line' | 'area') => {
    setChartType(type);
  }, []);

  // Handle Set Targets button
  const handleSetTargets = useCallback(() => {
    // You can implement a modal or navigate to a targets page
    console.log('Set Targets clicked - implement target setting functionality');
  }, []);

  return (
    <MainLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Carbon Dashboard</h1>
            <p className="text-gray-600">Monitor and track your organization's carbon emissions</p>
          </div>
          <div className="flex items-center gap-2 mt-4 sm:mt-0">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Data Quality: 94%
            </Badge>
            <Button variant="outline" size="sm" onClick={handleSetTargets}>
              <Target className="h-4 w-4 mr-2" />
              Set Targets
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <FilterBar filters={filters} onFiltersChange={setFilters} />

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard
            title="Current Month Emissions"
            value={dashboardData?.kpis.monthly.total || 0}
            unit="tCO₂e"
            change={dashboardData?.kpis.monthly.percentChange}
            changeType={dashboardData?.kpis.monthly.percentChange && dashboardData.kpis.monthly.percentChange < 0 ? "decrease" : "increase"}
            breakdown={{
              scope1: dashboardData?.kpis.monthly.scope1 || 0,
              scope2: dashboardData?.kpis.monthly.scope2 || 0,
              scope3: dashboardData?.kpis.monthly.scope3 || 0
            }}
            lastUpdated={dashboardData?.entries.latest?.date}
            isLoading={isLoading}
          />
          <KpiCard
            title="Current Quarter Emissions"
            value={dashboardData?.kpis.quarterly.total || 0}
            unit="tCO₂e"
            change={dashboardData?.kpis.quarterly.percentChange}
            changeType={dashboardData?.kpis.quarterly.percentChange && dashboardData.kpis.quarterly.percentChange < 0 ? "decrease" : "increase"}
            breakdown={{
              scope1: dashboardData?.kpis.quarterly.scope1 || 0,
              scope2: dashboardData?.kpis.quarterly.scope2 || 0,
              scope3: dashboardData?.kpis.quarterly.scope3 || 0
            }}
            isLoading={isLoading}
          />
          <KpiCard
            title="Year-to-Date Emissions"
            value={dashboardData?.kpis.ytd.total || 0}
            unit="tCO₂e"
            change={dashboardData?.kpis.ytd.percentChange}
            changeType={dashboardData?.kpis.ytd.percentChange && dashboardData.kpis.ytd.percentChange < 0 ? "decrease" : "increase"}
            breakdown={{
              scope1: dashboardData?.kpis.ytd.scope1 || 0,
              scope2: dashboardData?.kpis.ytd.scope2 || 0,
              scope3: dashboardData?.kpis.ytd.scope3 || 0
            }}
            target={{ 
              value: dashboardData?.targets.baselineEmissions || 0, 
              progress: dashboardData?.targets.currentProgress || 0 
            }}
            isLoading={isLoading}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Emissions Over Time */}
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
              <CardDescription>Monthly emissions by scope over time</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[350px] w-full" />
              ) : (
                <TimeSeriesChart 
                  data={dashboardData?.timeSeries.monthly || []} 
                  type={chartType} 
                  filters={filters}
                />
              )}
            </CardContent>
          </Card>

          {/* Emission Reduction Target */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                Emission Reduction Target
              </CardTitle>
              <CardDescription>Progress towards {dashboardData?.targets.currentTarget || 20}% reduction by {dashboardData?.targets.targetYear || 2030}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {dashboardData?.targets.currentProgress.toFixed(1) || 0}%
                    </div>
                    <div className="text-sm text-gray-500">Current Progress</div>
                  </div>
                  <Progress value={dashboardData?.targets.currentProgress || 0} className="h-3" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Baseline Year</div>
                      <div className="font-semibold">{dashboardData?.targets.baselineYear || 2024}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Target Year</div>
                      <div className="font-semibold">{dashboardData?.targets.targetYear || 2030}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Baseline Emissions</div>
                      <div className="font-semibold">{dashboardData?.targets.baselineEmissions.toLocaleString() || 0} tCO₂e</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Reduction Target</div>
                      <div className="font-semibold">{dashboardData?.targets.currentTarget || 20}%</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Emissions by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Emissions by Category</CardTitle>
              <CardDescription>Top emission sources ranked by impact</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <CategoryBarChart data={dashboardData?.breakdowns.byCategory || []} />
              )}
            </CardContent>
          </Card>

          {/* Emissions by Scope */}
          <Card>
            <CardHeader>
              <CardTitle>Emissions by Scope</CardTitle>
              <CardDescription>Breakdown showing % of total emissions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : (
                <ScopeDonutChart 
                  data={dashboardData?.breakdowns.byScope || []} 
                  filters={filters}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Data Quality Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Data Quality & Actions</CardTitle>
            <CardDescription>Monitor data completeness and resolve issues</CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardMatchStatus 
              matched={matchCounts.matched}
              unmatched={matchCounts.unmatched}
              total={matchCounts.total}
              loading={matchLoading}
            />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
