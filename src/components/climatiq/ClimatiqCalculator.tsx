import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ProcurementForm } from './ProcurementForm';
import { BasicEstimateForm } from './BasicEstimateForm';
import { ElectricityForm } from './ElectricityForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Info } from 'lucide-react';

export function ClimatiqCalculator() {
  const [activeTab, setActiveTab] = useState('basicEstimate');

  return (
    <div className="w-full max-w-4xl mx-auto py-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Climatiq Carbon Calculator</CardTitle>
          <CardDescription>
            Calculate carbon emissions across multiple activity types using the Climatiq API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-2 text-sm text-slate-600 dark:text-slate-400">
            <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p>
              This calculator provides various tools to estimate carbon emissions. Select the
              calculation type that best fits your needs. Data is provided by Climatiq's emissions
              database.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full mb-6">
          <TabsTrigger value="basicEstimate">Basic Estimate</TabsTrigger>
          <TabsTrigger value="procurement">Procurement</TabsTrigger>
          <TabsTrigger value="electricity">Electricity</TabsTrigger>
        </TabsList>

        <TabsContent value="basicEstimate">
          <BasicEstimateForm />
        </TabsContent>

        <TabsContent value="procurement">
          <ProcurementForm />
        </TabsContent>

        <TabsContent value="electricity">
          <ElectricityForm />
        </TabsContent>
      </Tabs>
    </div>
  );
} 