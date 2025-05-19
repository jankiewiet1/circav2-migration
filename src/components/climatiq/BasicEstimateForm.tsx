import React, { useState } from 'react';
import { EstimateRequest, EstimateResponse, estimate } from '../../integrations/climatiq';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from '../ui/use-toast';

const CALCULATION_METHODS = [
  { value: 'ar4', label: 'AR4' },
  { value: 'ar5', label: 'AR5' },
  { value: 'ar6', label: 'AR6' },
];

const PARAMETER_TYPES = [
  { value: 'energy', label: 'Energy (kWh)' },
  { value: 'distance', label: 'Distance (km)' },
  { value: 'weight', label: 'Weight (kg)' },
  { value: 'volume', label: 'Volume (l)' },
  { value: 'money', label: 'Money (€)' },
  { value: 'time', label: 'Time (hours)' },
];

export function BasicEstimateForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EstimateResponse | null>(null);
  const [formData, setFormData] = useState<{
    activityId: string;
    dataVersion: string;
    region?: string;
    year?: number;
    calculationMethod?: string;
    parameterType: string;
    parameterValue: number;
    parameterUnit: string;
  }>({
    activityId: 'electricity-supply_grid-source_residual_mix',
    dataVersion: '^21',
    region: 'NL',
    year: undefined,
    calculationMethod: undefined,
    parameterType: 'energy',
    parameterValue: 1000,
    parameterUnit: 'kWh',
  });

  // Predefined example configurations for common calculations
  const examples = [
    {
      id: 'electricity',
      name: 'Electricity',
      config: {
        activityId: 'electricity-supply_grid-source_residual_mix',
        dataVersion: '^21',
        region: 'NL',
        parameterType: 'energy',
        parameterValue: 1000,
        parameterUnit: 'kWh',
      },
    },
    {
      id: 'car-travel',
      name: 'Car Travel',
      config: {
        activityId: 'passenger_vehicle-vehicle_type_car-fuel_source_petrol-distance_na',
        dataVersion: '^21',
        parameterType: 'distance',
        parameterValue: 100,
        parameterUnit: 'km',
      },
    },
    {
      id: 'office-equipment',
      name: 'Office Equipment',
      config: {
        activityId: 'office_equipment-type_office_machinery_computers',
        dataVersion: '^21',
        region: 'DE',
        parameterType: 'money',
        parameterValue: 1000,
        parameterUnit: 'eur',
      },
    },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? (value ? parseFloat(value) : undefined) : value,
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const setExample = (exampleId: string) => {
    const example = examples.find((ex) => ex.id === exampleId);
    if (example) {
      setFormData({
        ...formData,
        ...example.config,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const request: EstimateRequest = {
        emission_factor: {
          activity_id: formData.activityId,
          data_version: formData.dataVersion,
        },
        parameters: {
          [formData.parameterType]: formData.parameterValue,
          [`${formData.parameterType}_unit`]: formData.parameterUnit,
        },
      };

      // Add optional parameters if provided
      if (formData.region) {
        request.emission_factor.region = formData.region;
      }
      if (formData.year) {
        request.emission_factor.year = formData.year;
      }
      if (formData.calculationMethod) {
        request.emission_factor.calculation_method = formData.calculationMethod as any;
      }

      const response = await estimate(request);
      setResult(response);
      toast({
        title: 'Calculation Complete',
        description: `Estimated emissions: ${response.co2e} ${response.co2e_unit}`,
      });
    } catch (error) {
      console.error('Error calculating emissions:', error);
      toast({
        title: 'Calculation Error',
        description: 'Failed to calculate emissions. Please check your inputs and try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Basic Emissions Calculator</CardTitle>
          <CardDescription>
            Calculate emissions by multiplying activity data by emission factors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="form">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="form">Custom Calculation</TabsTrigger>
              <TabsTrigger value="examples">Quick Examples</TabsTrigger>
            </TabsList>
            <TabsContent value="form">
              <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="activityId">Activity ID</Label>
                  <Input
                    id="activityId"
                    name="activityId"
                    value={formData.activityId}
                    onChange={handleChange}
                    placeholder="e.g. electricity-supply_grid-source_residual_mix"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dataVersion">Data Version</Label>
                    <Input
                      id="dataVersion"
                      name="dataVersion"
                      value={formData.dataVersion}
                      onChange={handleChange}
                      placeholder="e.g. ^21"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="region">Region (optional)</Label>
                    <Input
                      id="region"
                      name="region"
                      value={formData.region}
                      onChange={handleChange}
                      placeholder="e.g. NL, GB, DE"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="year">Year (optional)</Label>
                    <Input
                      id="year"
                      name="year"
                      type="number"
                      value={formData.year || ''}
                      onChange={handleChange}
                      placeholder="e.g. 2023"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="calculationMethod">Calculation Method (optional)</Label>
                    <Select
                      value={formData.calculationMethod}
                      onValueChange={(value) => handleSelectChange('calculationMethod', value)}
                    >
                      <SelectTrigger id="calculationMethod">
                        <SelectValue placeholder="Select method (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {CALCULATION_METHODS.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Parameter</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="parameterType">Type</Label>
                      <Select
                        value={formData.parameterType}
                        onValueChange={(value) => handleSelectChange('parameterType', value)}
                      >
                        <SelectTrigger id="parameterType">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {PARAMETER_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parameterValue">Value</Label>
                      <Input
                        id="parameterValue"
                        name="parameterValue"
                        type="number"
                        value={formData.parameterValue}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parameterUnit">Unit</Label>
                      <Input
                        id="parameterUnit"
                        name="parameterUnit"
                        value={formData.parameterUnit}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Calculating...' : 'Calculate Emissions'}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="examples">
              <div className="space-y-4 mt-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Choose from these pre-configured examples to quickly calculate common emissions.
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  {examples.map((example) => (
                    <Card key={example.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900">
                      <CardHeader className="p-4">
                        <CardTitle className="text-base">{example.name}</CardTitle>
                        <CardDescription>
                          {example.config.parameterValue} {example.config.parameterUnit}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className="p-4 pt-0">
                        <Button onClick={() => setExample(example.id)} variant="outline" className="w-full">
                          Use Example
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-center mt-4">
                  <Button onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Calculating...' : 'Calculate Selected Example'}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        {result && (
          <CardFooter className="flex flex-col items-start">
            <h3 className="text-lg font-semibold mb-2">Results</h3>
            <div className="w-full space-y-4">
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium">CO2e:</div>
                  <div className="text-sm">
                    {result.co2e} {result.co2e_unit}
                  </div>
                  <div className="text-sm font-medium">Calculation Method:</div>
                  <div className="text-sm">{result.co2e_calculation_method}</div>
                  {result.emission_factor && (
                    <>
                      <div className="text-sm font-medium">Emission Factor:</div>
                      <div className="text-sm">{result.emission_factor.name}</div>
                      <div className="text-sm font-medium">Source:</div>
                      <div className="text-sm">{result.emission_factor.source}</div>
                      <div className="text-sm font-medium">Region:</div>
                      <div className="text-sm">{result.emission_factor.region}</div>
                      <div className="text-sm font-medium">Year:</div>
                      <div className="text-sm">{result.emission_factor.year}</div>
                    </>
                  )}
                  <div className="text-sm font-medium">Parameter:</div>
                  <div className="text-sm">
                    {result.activity_data.activity_value} {result.activity_data.activity_unit}
                  </div>
                </div>
                {result.constituent_gases && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold mb-2">Constituent Gases</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {result.constituent_gases.co2 !== null && (
                        <>
                          <div className="text-sm font-medium">CO2:</div>
                          <div className="text-sm">{result.constituent_gases.co2} kg</div>
                        </>
                      )}
                      {result.constituent_gases.ch4 !== null && (
                        <>
                          <div className="text-sm font-medium">CH4:</div>
                          <div className="text-sm">{result.constituent_gases.ch4} kg</div>
                        </>
                      )}
                      {result.constituent_gases.n2o !== null && (
                        <>
                          <div className="text-sm font-medium">N2O:</div>
                          <div className="text-sm">{result.constituent_gases.n2o} kg</div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {result.notices.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold mb-2">Notices</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {result.notices.map((notice, index) => (
                      <li key={index} className={notice.severity === 'warning' ? 'text-amber-600' : 'text-blue-600'}>
                        {notice.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
} 