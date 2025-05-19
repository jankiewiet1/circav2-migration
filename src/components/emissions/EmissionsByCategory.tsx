import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Treemap, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { useCompany } from '@/contexts/CompanyContext';
import { ChartContainer } from '@/components/ui/chart';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useScopeEntries, EmissionEntryWithCalculation } from '@/hooks/useScopeEntries';
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';

interface TreemapData {
  name: string;
  size: number;
  color: string;
  percentOfTotal: number;
}

const getCalculatedEmissions = (entry: EmissionEntryWithCalculation): number => {
  if (entry.emission_calc_climatiq && entry.emission_calc_climatiq.length > 0) {
    return entry.emission_calc_climatiq[0]?.total_emissions ?? 0;
  }
  return 0;
};

export const EmissionsByCategory = () => {
  const COLORS = ['#D6F3E7', '#AAE3CA', '#6ED0AA', '#3AB688', '#0E5D40'];
  
  const { company } = useCompany();
  const { entries, loading, error, refetch } = useScopeEntries(1);

  const { treemapData, totalEmissions, hasCalculationIssues } = useMemo(() => {
    if (loading || !entries || entries.length === 0) {
      return { treemapData: [], totalEmissions: 0, hasCalculationIssues: false };
    }

    let hasIssues = false;
      const categoryEmissions: Record<string, number> = {};
    entries.forEach(entry => {
      const cat = entry.category || 'Unknown';
      const emissions = getCalculatedEmissions(entry);
      if (emissions === 0 && entry.quantity > 0) {
        hasIssues = true;
      } 
      categoryEmissions[cat] = (categoryEmissions[cat] || 0) + emissions;
      });

      const total = Object.values(categoryEmissions).reduce((sum, val) => sum + val, 0);
    const maxEmission = Math.max(...Object.values(categoryEmissions).filter(v => v > 0), 0);

    const getColor = (value: number, max: number) => {
      if (max === 0) return '#D6F3E7';
      const colors = ['#D6F3E7', '#AAE3CA', '#6ED0AA', '#3AB688', '#0E5D40'];
      const index = value <= 0 ? 0 : Math.min(Math.floor((value / max) * (colors.length - 1)), colors.length - 1);
      return colors[index];
    };

    const data: TreemapData[] = Object.entries(categoryEmissions)
      .filter(([, value]) => value > 0)
      .map(([category, value]) => ({
        name: category,
        size: parseFloat(value.toFixed(2)),
        color: getColor(value, maxEmission),
        percentOfTotal: total > 0 ? (value / total) * 100 : 0,
      }));

    return { 
      treemapData: data, 
      totalEmissions: total, 
      hasCalculationIssues: hasIssues 
    };

  }, [entries, loading]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background p-3 border shadow-lg rounded-md text-sm">
          <p className="font-bold mb-1">{data.name}</p>
          <p className="text-muted-foreground">{data.size.toFixed(2)} tCO₂e</p>
          <p className="text-muted-foreground">{data.percentOfTotal.toFixed(1)}% of total</p>
        </div>
      );
    }
    return null;
  };

  const CustomTreemapContent = React.memo(({ root, depth, x, y, width, height, index, colors, name, value }: any) => {
    const nodeWidth = width;
    const nodeHeight = height;
    const showText = nodeWidth > 60 && nodeHeight > 30;
    const nodeColor = root.children?.[index]?.payload?.color || colors[Math.floor(Math.random() * colors.length)];

    return (
      <g>
              <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: nodeColor, 
            stroke: '#fff',
            strokeWidth: 2 / (depth + 1e-10),
            strokeOpacity: 1 / (depth + 1e-10),
          }}
              />
              {showText && (
                  <text
            x={x + width / 2}
            y={y + height / 2 + 7}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={12}
            style={{ textShadow: '0px 0px 3px rgba(0,0,0,0.7)' }}
                  >
            {name} ({value?.toFixed(1)} tCO₂e)
                  </text>
              )}
            </g>
          );
  });

  if (error) {
    return (
      <Alert variant="destructive" className="my-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Scope 1 Categories</AlertTitle>
        <AlertDescription>
          {error || "An unexpected error occurred."}
          <Button variant="secondary" size="sm" onClick={refetch} className="ml-4">
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle>Scope 1 Emissions by Category</CardTitle>
        <CardDescription>
          Breakdown by category, sized by total emissions (tCO₂e)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasCalculationIssues && !loading && (
          <Alert variant="warning" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Potential Calculation Issues</AlertTitle>
            <AlertDescription>
              Some entries resulted in zero calculated emissions despite having a quantity greater than zero. 
              This might indicate missing or incorrect emission factors for certain categories or units. 
              Please review your emission factors and data entries.
              <Button asChild variant="link" size="sm" className="p-0 h-auto ml-2 text-amber-700 hover:text-amber-800">
                <Link to="/settings">Review Factors</Link>
                </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="h-96 w-full">
          {loading ? (
            <Skeleton className="h-full w-full rounded-lg" />
          ) : treemapData.length > 0 ? (
            <ChartContainer config={{}} >
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  width={400}
                  height={200}
                  data={treemapData}
                  dataKey="size"
                  stroke="#fff"
                  fill="#0E5D40"
                  isAnimationActive={false}
                  content={<CustomTreemapContent colors={COLORS} />}
                >
                  <RechartsTooltip content={<CustomTooltip />} />
                </Treemap>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <p className="mb-2">No Scope 1 emissions data available by category.</p>
              {hasCalculationIssues && (
                <p className="text-sm text-amber-600"> 
                  Calculation issues detected, please review factors.
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
