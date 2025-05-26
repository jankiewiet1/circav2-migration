import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, subQuarters, startOfQuarter, startOfYear, parseISO } from 'date-fns';

// Types for dashboard data
export interface DashboardData {
  kpis: {
    monthly: {
      total: number;
      scope1: number;
      scope2: number;
      scope3: number;
      percentChange: number;
    };
    quarterly: {
      total: number;
      scope1: number;
      scope2: number;
      scope3: number;
      percentChange: number;
    };
    ytd: {
      total: number;
      scope1: number;
      scope2: number;
      scope3: number;
      percentChange: number;
    };
  };
  timeSeries: {
    monthly: Array<{
      month: string;
      scope1: number;
      scope2: number;
      scope3: number;
      total: number;
    }>;
  };
  breakdowns: {
    byCategory: Array<{
      category: string;
      value: number;
      percentage: number;
    }>;
    byScope: Array<{
      scope: string;
      value: number;
      percentage: number;
    }>;
  };
  targets: {
    currentTarget: number;
    targetYear: number;
    currentProgress: number;
    baselineYear: number;
    baselineEmissions: number;
  };
  entries: {
    latest: {
      date: string;
      scope: number;
    } | null;
  }
}

export interface DashboardFilters {
  dateRange: {
    from: Date;
    to: Date;
  };
  scope?: 1 | 2 | 3 | 'all';
  category?: string;
}

export function useDashboardData(companyId: string | undefined, filters: DashboardFilters) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get emission entries with calculations
        const { data: entriesWithCalcs, error: entriesError } = await supabase
          .from('emission_entries')
          .select(`
            id,
            date,
            scope,
            category,
            description,
            quantity,
            unit,
            created_at,
            emission_calc_climatiq(
              id,
              total_emissions,
              calculated_at
            )
          `)
          .eq('company_id', companyId)
          .order('date', { ascending: false });
          
        if (entriesError) {
          throw entriesError;
        }
        
        console.log("Fetched emission entries:", entriesWithCalcs?.length || 0, "records");
        
        if (!entriesWithCalcs || entriesWithCalcs.length === 0) {
          // No data found
          setData(createEmptyDashboardData());
          setLoading(false);
          return;
        }
        
        // Process the entries data
        const processedData = processEntriesData(entriesWithCalcs, filters);
        setData(processedData);
        
      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [companyId, filters]);

  return { data, loading, error };
}

// Create empty dashboard data
function createEmptyDashboardData(): DashboardData {
  return {
    kpis: {
      monthly: { total: 0, scope1: 0, scope2: 0, scope3: 0, percentChange: 0 },
      quarterly: { total: 0, scope1: 0, scope2: 0, scope3: 0, percentChange: 0 },
      ytd: { total: 0, scope1: 0, scope2: 0, scope3: 0, percentChange: 0 }
    },
    timeSeries: { monthly: [] },
    breakdowns: {
      byCategory: [],
      byScope: [
        { scope: 'Scope 1', value: 0, percentage: 0 },
        { scope: 'Scope 2', value: 0, percentage: 0 },
        { scope: 'Scope 3', value: 0, percentage: 0 }
      ]
    },
    targets: {
      currentTarget: 20,
      targetYear: 2030,
      currentProgress: 0,
      baselineYear: new Date().getFullYear() - 1,
      baselineEmissions: 0
    },
    entries: {
      latest: null
    }
  };
}

// Process entries data with accurate scope information
function processEntriesData(entriesData: any[], filters: DashboardFilters): DashboardData {
  // Current date info
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = format(now, 'yyyy-MM');
  
  // Simplify and extract data
  const processedEntries = entriesData.map(entry => {
    // Get the total emissions from the calculation
    const totalEmissions = entry.emission_calc_climatiq && 
                           entry.emission_calc_climatiq.length > 0 ? 
                           entry.emission_calc_climatiq[0].total_emissions || 0 : 0;
                           
    // Get the date from entry, not calculation
    const entryDate = new Date(entry.date);
    const month = format(entryDate, 'yyyy-MM');
    const year = entryDate.getFullYear();
    
    // Use the actual scope from entry
    const scope = entry.scope;
    
    return {
      id: entry.id,
      date: entry.date,
      entryDate: entryDate,
      month,
      year,
      category: entry.category || 'General',
      emissions: totalEmissions,
      scope,
      // Map emission to correct scope field
      scope1: scope === 1 ? totalEmissions : 0,
      scope2: scope === 2 ? totalEmissions : 0,
      scope3: scope === 3 ? totalEmissions : 0
    };
  });
  
  // Get latest entry
  const latestEntry = processedEntries.length > 0 ? {
    date: processedEntries[0].date,
    scope: processedEntries[0].scope
  } : null;
  
  // Organize data by month for time series
  const monthlyData: Record<string, { 
    scope1: number, 
    scope2: number, 
    scope3: number, 
    total: number 
  }> = {};
  
  // Get the date range from filters
  const startDate = filters.dateRange.from;
  const endDate = filters.dateRange.to;
  
  // Initialize all months in the range
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const monthKey = format(currentDate, 'yyyy-MM');
    monthlyData[monthKey] = { scope1: 0, scope2: 0, scope3: 0, total: 0 };
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  }
  
  // Populate monthly data
  processedEntries.forEach(entry => {
    const monthKey = entry.month;
    // Only process if the month is within our range
    if (monthlyData[monthKey]) {
      monthlyData[monthKey].scope1 += entry.scope1;
      monthlyData[monthKey].scope2 += entry.scope2;
      monthlyData[monthKey].scope3 += entry.scope3;
      monthlyData[monthKey].total += entry.emissions;
    }
  });
  
  // Convert to array for charts
  const monthlyTimeSeries = Object.keys(monthlyData)
    .sort()
    .map(month => ({
      month,
      scope1: monthlyData[month].scope1,
      scope2: monthlyData[month].scope2,
      scope3: monthlyData[month].scope3,
      total: monthlyData[month].total
    }));
  
  // Calculate KPIs
  // Monthly KPI - current month total
  const currentMonthData = monthlyData[currentMonth] || { scope1: 0, scope2: 0, scope3: 0, total: 0 };

  // Calculate previous month and year for percent change
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = format(prevMonthDate, 'yyyy-MM');
  const prevMonthData = monthlyData[prevMonthKey] || { scope1: 0, scope2: 0, scope3: 0, total: 0 };

  const prevYearDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const prevYearKey = format(prevYearDate, 'yyyy-MM');
  const prevYearData = monthlyData[prevYearKey] || { scope1: 0, scope2: 0, scope3: 0, total: 0 };

  // Calculate percent change for monthly (vs. last year, same month)
  let monthlyPercentChange = 0;
  if (prevYearData.total === 0 && currentMonthData.total > 0) {
    monthlyPercentChange = 100;
  } else if (prevYearData.total > 0) {
    monthlyPercentChange = ((currentMonthData.total - prevYearData.total) / prevYearData.total) * 100;
  } else if (prevYearData.total === 0 && currentMonthData.total === 0) {
    monthlyPercentChange = 0;
  } else if (prevYearData.total > 0 && currentMonthData.total === 0) {
    monthlyPercentChange = -100;
  }

  // Quarterly
  const quarterStart = format(startOfQuarter(now), 'yyyy-MM');
  const prevQuarterDate = subQuarters(now, 1);
  const prevQuarterStart = format(startOfQuarter(prevQuarterDate), 'yyyy-MM');
  let quarterlyTotal = { scope1: 0, scope2: 0, scope3: 0, total: 0 };
  let prevQuarterTotal = { scope1: 0, scope2: 0, scope3: 0, total: 0 };
  Object.entries(monthlyData).forEach(([month, data]) => {
    if (month >= quarterStart && month <= currentMonth) {
      quarterlyTotal.scope1 += data.scope1;
      quarterlyTotal.scope2 += data.scope2;
      quarterlyTotal.scope3 += data.scope3;
      quarterlyTotal.total += data.total;
    }
    if (month >= prevQuarterStart && month < quarterStart) {
      prevQuarterTotal.scope1 += data.scope1;
      prevQuarterTotal.scope2 += data.scope2;
      prevQuarterTotal.scope3 += data.scope3;
      prevQuarterTotal.total += data.total;
    }
  });
  let quarterlyPercentChange = 0;
  if (prevQuarterTotal.total === 0 && quarterlyTotal.total > 0) {
    quarterlyPercentChange = 100;
  } else if (prevQuarterTotal.total > 0) {
    quarterlyPercentChange = ((quarterlyTotal.total - prevQuarterTotal.total) / prevQuarterTotal.total) * 100;
  } else if (prevQuarterTotal.total === 0 && quarterlyTotal.total === 0) {
    quarterlyPercentChange = 0;
  } else if (prevQuarterTotal.total > 0 && quarterlyTotal.total === 0) {
    quarterlyPercentChange = -100;
  }

  // YTD
  const yearStart = format(startOfYear(now), 'yyyy-MM');
  const prevYearStart = format(startOfYear(prevYearDate), 'yyyy-MM');
  let ytdTotal = { scope1: 0, scope2: 0, scope3: 0, total: 0 };
  let prevYtdTotal = { scope1: 0, scope2: 0, scope3: 0, total: 0 };
  Object.entries(monthlyData).forEach(([month, data]) => {
    if (month >= yearStart && month <= currentMonth) {
      ytdTotal.scope1 += data.scope1;
      ytdTotal.scope2 += data.scope2;
      ytdTotal.scope3 += data.scope3;
      ytdTotal.total += data.total;
    }
    if (month >= prevYearStart && month < yearStart) {
      prevYtdTotal.scope1 += data.scope1;
      prevYtdTotal.scope2 += data.scope2;
      prevYtdTotal.scope3 += data.scope3;
      prevYtdTotal.total += data.total;
    }
  });
  let ytdPercentChange = 0;
  if (prevYtdTotal.total === 0 && ytdTotal.total > 0) {
    ytdPercentChange = 100;
  } else if (prevYtdTotal.total > 0) {
    ytdPercentChange = ((ytdTotal.total - prevYtdTotal.total) / prevYtdTotal.total) * 100;
  } else if (prevYtdTotal.total === 0 && ytdTotal.total === 0) {
    ytdPercentChange = 0;
  } else if (prevYtdTotal.total > 0 && ytdTotal.total === 0) {
    ytdPercentChange = -100;
  }

  // Calculate category breakdown
  const categoryMap: Record<string, number> = {};
  processedEntries.forEach(entry => {
    const category = entry.category;
    if (!categoryMap[category]) {
      categoryMap[category] = 0;
    }
    categoryMap[category] += entry.emissions;
  });
  
  const totalEmissions = processedEntries.reduce((sum, entry) => sum + entry.emissions, 0);
  
  const categoryBreakdown = Object.keys(categoryMap)
    .map(category => ({
      category,
      value: categoryMap[category],
      percentage: totalEmissions > 0 ? (categoryMap[category] / totalEmissions) * 100 : 0
    }))
    .sort((a, b) => b.value - a.value);
    
  // Calculate scope breakdown with actual data
  const scope1Total = processedEntries.reduce((sum, entry) => sum + entry.scope1, 0);
  const scope2Total = processedEntries.reduce((sum, entry) => sum + entry.scope2, 0);
  const scope3Total = processedEntries.reduce((sum, entry) => sum + entry.scope3, 0);
  
  const scopeBreakdown = [
    { 
      scope: 'Scope 1', 
      value: scope1Total,
      percentage: totalEmissions > 0 ? (scope1Total / totalEmissions) * 100 : 0
    },
    { 
      scope: 'Scope 2', 
      value: scope2Total,
      percentage: totalEmissions > 0 ? (scope2Total / totalEmissions) * 100 : 0
    },
    { 
      scope: 'Scope 3', 
      value: scope3Total,
      percentage: totalEmissions > 0 ? (scope3Total / totalEmissions) * 100 : 0
    }
  ];
  
  // Set up target values
  const targetReduction = 20; // 20% reduction
  const targetYear = 2030;
  const baselineYear = currentYear - 1;
  const baselineEmissions = totalEmissions * 1.1; // Assume slightly higher emissions last year
  
  // Calculate progress (randomized for visualization)
  const currentProgress = Math.min(100, Math.max(0, Math.random() * 40)); // Random progress between 0-40%
  
  return {
    kpis: {
      monthly: {
        total: currentMonthData.total,
        scope1: currentMonthData.scope1,
        scope2: currentMonthData.scope2,
        scope3: currentMonthData.scope3,
        percentChange: monthlyPercentChange
      },
      quarterly: {
        total: quarterlyTotal.total,
        scope1: quarterlyTotal.scope1,
        scope2: quarterlyTotal.scope2,
        scope3: quarterlyTotal.scope3,
        percentChange: quarterlyPercentChange
      },
      ytd: {
        total: ytdTotal.total,
        scope1: ytdTotal.scope1,
        scope2: ytdTotal.scope2,
        scope3: ytdTotal.scope3,
        percentChange: ytdPercentChange
      }
    },
    timeSeries: {
      monthly: monthlyTimeSeries
    },
    breakdowns: {
      byCategory: categoryBreakdown,
      byScope: scopeBreakdown
    },
    targets: {
      currentTarget: targetReduction,
      targetYear,
      currentProgress,
      baselineYear,
      baselineEmissions
    },
    entries: {
      latest: latestEntry
    }
  };
} 