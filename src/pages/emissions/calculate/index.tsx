import React from 'react';
import EmissionCalculator from "@/components/emission-calculator/EmissionCalculator";
import BatchCalculator from "@/components/emission-calculator/BatchCalculator";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { EmissionsSidebar } from '@/components/emissions/EmissionsSidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const EmissionCalculatorPage: React.FC = () => {
  return (
    <div className="flex h-screen">
      <EmissionsSidebar />
      <div className="flex-1 overflow-auto p-6">
        <div className="flex flex-col gap-8 max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Carbon Emission Calculator
              </h1>
              <p className="text-sm text-muted-foreground">
                Calculate your carbon emissions using the Climatiq API
              </p>
            </div>
            <Button asChild>
              <Link to="/emissions/overview">
                View Emissions
              </Link>
            </Button>
          </div>

          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual Calculator</TabsTrigger>
              <TabsTrigger value="batch">Batch Processing</TabsTrigger>
            </TabsList>
            <TabsContent value="manual">
              <EmissionCalculator />
            </TabsContent>
            <TabsContent value="batch">
              <BatchCalculator />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default EmissionCalculatorPage; 