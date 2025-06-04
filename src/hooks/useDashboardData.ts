import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, subQuarters, startOfQuarter, startOfYear, parseISO } from 'date-fns';
import { mapToGHGCategory, ALL_GHG_CATEGORIES } from '@/utils/ghgProtocolCategories';
import { unifiedCalculationService } from '@/services/unifiedCalculationService';

// Types for dashboard data
export interface DashboardData {
  kpis: {
    monthly: { total: number; scope1: number; scope2: number; scope3: number; percentChange?: number };
    quarterly: { total: number; scope1: number; scope2: number; scope3: number; percentChange?: number };
    ytd: { total: number; scope1: number; scope2: number; scope3: number; percentChange?: number };
  };
  timeSeries: {
    monthly: { 
      month: string; 
      "Scope 1": number; 
      "Scope 2": number; 
      "Scope 3": number; 
      total: number; 
    }[];
  };
  breakdowns: {
    byCategory: { category: string; emissions: number; percentage: number }[];
    byScope: { name: string; value: number; percentage: number }[];
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
  dateRange?: {
    from: Date;
    to: Date;
  };
  period?: string;
  scope?: 1 | 2 | 3 | 'all';
  scopes?: number[];
  category?: string;
  categories?: string[];
  company?: string;
}

export function useDashboardData(companyId: string | undefined, filters: DashboardFilters) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!companyId) {
      console.log('📊 Dashboard: No company ID provided');
      setLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('📊 Dashboard: Fetching unified calculations for company:', companyId);
        
        // Get all calculations using the unified service (RAG + Assistant)
        const response = await unifiedCalculationService.fetchAllCalculations(companyId);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch calculations');
        }

        const calculations = response.data;
        
        console.log('📊 Dashboard: Unified calculations received:', {
          total: calculations.length,
          rag: calculations.filter(c => c.calculation_method === 'RAG').length,
          openai: calculations.filter(c => c.calculation_method === 'OPENAI').length
        });
        
        if (calculations.length === 0) {
          console.log('📊 Dashboard: No calculations found, returning empty data');
          setData(createEmptyDashboardData());
          setLoading(false);
          return;
        }
        
        // Process the calculations data
        console.log('📊 Dashboard: Processing unified calculations...');
        const processedData = processUnifiedCalculationsData(calculations, filters);
        console.log('📊 Dashboard: Processed data:', {
          kpis: processedData.kpis,
          timeSeriesLength: processedData.timeSeries.monthly.length,
          categoriesLength: processedData.breakdowns.byCategory.length,
          scopesLength: processedData.breakdowns.byScope.length
        });
        setData(processedData);
        
      } catch (err: any) {
        console.error("📊 Dashboard: Error fetching dashboard data:", err);
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
        { name: 'Scope 1', value: 0, percentage: 0 },
        { name: 'Scope 2', value: 0, percentage: 0 },
        { name: 'Scope 3', value: 0, percentage: 0 }
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

// Process unified calculations data (RAG + Assistant)
function processUnifiedCalculationsData(calculations: any[], filters: DashboardFilters): DashboardData {
  console.log('📊 Processing unified calculations data, input:', calculations?.length, 'calculations');
  console.log('📊 Calculation methods breakdown:', {
    RAG: calculations.filter(c => c.calculation_method === 'RAG').length,
    OPENAI: calculations.filter(c => c.calculation_method === 'OPENAI').length
  });
  
  // Current date info
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = format(now, 'yyyy-MM');
  
  // Convert calculations to entries format for processing
  const processedEntries = calculations.map(calc => {
    const entryDate = new Date(calc.calculated_at);
    const month = format(entryDate, 'yyyy-MM');
    const year = entryDate.getFullYear();
    
    console.log('📊 Processing calculation:', {
      id: calc.id,
      category: calc.category,
      totalEmissions: calc.total_emissions,
      scope: calc.scope,
      method: calc.calculation_method,
      month
    });
    
    return {
      id: calc.entry_id,
      date: calc.calculated_at,
      entryDate: entryDate,
      month,
      year,
      category: calc.category || 'General',
      description: calc.description || '',
      emissions: calc.total_emissions || 0,
      scope: calc.scope,
      calculationMethod: calc.calculation_method,
      // Map emission to correct scope field
      scope1: calc.scope === 1 ? calc.total_emissions : 0,
      scope2: calc.scope === 2 ? calc.total_emissions : 0,
      scope3: calc.scope === 3 ? calc.total_emissions : 0
    };
  });
  
  console.log('📊 Processed calculations:', processedEntries.length, 
    'total emissions:', processedEntries.reduce((sum, entry) => sum + entry.emissions, 0),
    'RAG calculations:', processedEntries.filter(e => e.calculationMethod === 'RAG').length,
    'OPENAI calculations:', processedEntries.filter(e => e.calculationMethod === 'OPENAI').length);
  
  // Get latest calculation
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
  const startDate = filters.dateRange?.from || new Date(currentYear - 2, 0, 1);
  const endDate = filters.dateRange?.to || new Date();
  
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
      "Scope 1": monthlyData[month].scope1,
      "Scope 2": monthlyData[month].scope2,
      "Scope 3": monthlyData[month].scope3,
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

  // Calculate category breakdown using GHG Protocol categories
  const ghgCategoryMap: Record<string, number> = {};
  processedEntries.forEach(entry => {
    const originalCategory = entry.category;
    const ghgCategory = mapToGHGCategory(originalCategory, entry.description || '');
    
    // Use the mapped GHG category name, or fall back to original category
    const categoryName = ghgCategory ? ghgCategory.name : originalCategory;
    
    if (!ghgCategoryMap[categoryName]) {
      ghgCategoryMap[categoryName] = 0;
    }
    ghgCategoryMap[categoryName] += entry.emissions;
  });
  
  const totalEmissions = processedEntries.reduce((sum, entry) => sum + entry.emissions, 0);
  
  const categoryBreakdown = Object.keys(ghgCategoryMap)
    .map(category => ({
      category,
      emissions: ghgCategoryMap[category],
      percentage: totalEmissions > 0 ? (ghgCategoryMap[category] / totalEmissions) * 100 : 0
    }))
    .sort((a, b) => b.emissions - a.emissions)
    .slice(0, 10); // Show top 10 categories
    
  // Calculate scope breakdown with actual data
  const scope1Total = processedEntries.reduce((sum, entry) => sum + entry.scope1, 0);
  const scope2Total = processedEntries.reduce((sum, entry) => sum + entry.scope2, 0);
  const scope3Total = processedEntries.reduce((sum, entry) => sum + entry.scope3, 0);
  
  const scopeBreakdown = [
    { 
      name: 'Scope 1',
      value: scope1Total,
      percentage: totalEmissions > 0 ? (scope1Total / totalEmissions) * 100 : 0
    },
    { 
      name: 'Scope 2',
      value: scope2Total,
      percentage: totalEmissions > 0 ? (scope2Total / totalEmissions) * 100 : 0
    },
    { 
      name: 'Scope 3',
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