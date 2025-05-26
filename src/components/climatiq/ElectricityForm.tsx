import React, { useState } from 'react';
import {
  ElectricityRequest,
  ElectricityResponse,
  estimateElectricity,
  ElectricityComponent,
  EnergyAmount,
} from '../../integrations/climatiq';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { toast } from '../ui/use-toast';
import { PlusCircle, Trash2 } from 'lucide-react';

export function ElectricityForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ElectricityResponse | null>(null);
  const [formData, setFormData] = useState<{
    region: string;
    year: number;
    amount: EnergyAmount;
    recs?: EnergyAmount;
    source_set: 'core' | 'iea';
    components: ElectricityComponent[];
    allow_iea_provisional: boolean;
  }>({
    region: 'GB',
    year: new Date().getFullYear(),
    amount: {
      energy: 5000,
      energy_unit: 'kWh',
    },
    source_set: 'core',
    components: [
      {
        amount: {
          energy: 1000,
          energy_unit: 'kWh',
        },
        connection_type: 'grid',
      },
    ],
    allow_iea_provisional: false,
  });

  const addComponent = () => {
    setFormData({
      ...formData,
      components: [
        ...formData.components,
        {
          amount: {
            energy: 1000,
            energy_unit: 'kWh',
          },
          connection_type: 'grid',
        },
      ],
    });
  };

  const removeComponent = (index: number) => {
    const newComponents = [...formData.components];
    newComponents.splice(index, 1);
    setFormData({
      ...formData,
      components: newComponents,
    });
  };

  const handleComponentChange = (index: number, field: string, value: any) => {
    const newComponents = [...formData.components];
    
    if (field === 'energy' || field === 'energy_unit') {
      newComponents[index] = {
        ...newComponents[index],
        amount: {
          ...newComponents[index].amount,
          [field]: field === 'energy' ? parseFloat(value) : value,
        },
      };
    } else {
      newComponents[index] = {
        ...newComponents[index],
        [field]: field === 'loss_factor' ? parseFloat(value) : value,
      };
    }
    
    setFormData({
      ...formData,
      components: newComponents,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'energy' || name === 'energy_unit') {
      setFormData({
        ...formData,
        amount: {
          ...formData.amount,
          [name]: type === 'number' ? parseFloat(value) : value,
        },
      });
    } else if (name === 'recs_energy' || name === 'recs_energy_unit') {
      const fieldName = name.replace('recs_', '');
      setFormData({
        ...formData,
        recs: {
          ...formData.recs || { energy: 0, energy_unit: 'kWh' },
          [fieldName]: type === 'number' ? parseFloat(value) : value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'number' ? parseFloat(value) : value,
      });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const toggleRECs = (enabled: boolean) => {
    if (enabled) {
      setFormData({
        ...formData,
        recs: {
          energy: 1000,
          energy_unit: 'kWh',
        },
      });
    } else {
      const { recs, ...rest } = formData;
      setFormData(rest as any);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const request: ElectricityRequest = {
        region: formData.region,
        year: formData.year,
        amount: formData.amount,
        source_set: formData.source_set,
        components: formData.components,
        allow_iea_provisional: formData.allow_iea_provisional,
      };

      if (formData.recs) {
        request.recs = formData.recs;
      }

      const response = await estimateElectricity(request);
      setResult(response);
      toast({
        title: 'Calculation Complete',
        description: `Location-based emissions: ${response.location.consumption.co2e} ${response.location.consumption.co2e_unit}`,
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
          <CardTitle>Electricity Emissions Calculator</CardTitle>
          <CardDescription>
            Calculate scope 2 emissions (and associated scope 3) from electricity consumption
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Input
                  id="region"
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  placeholder="e.g. GB, US, DE"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  name="year"
                  type="number"
                  value={formData.year}
                  onChange={handleChange}
                  min="2000"
                  max="2030"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source_set">Source Set</Label>
                <Select
                  value={formData.source_set}
                  onValueChange={(value) => handleSelectChange('source_set', value as 'core' | 'iea')}
                >
                  <SelectTrigger id="source_set">
                    <SelectValue placeholder="Select source set" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="core">Core</SelectItem>
                    <SelectItem value="iea">IEA (Premium)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="allow_iea_provisional"
                  checked={formData.allow_iea_provisional}
                  onCheckedChange={(checked) => {
                    setFormData({
                      ...formData,
                      allow_iea_provisional: checked,
                    });
                  }}
                />
                <Label htmlFor="allow_iea_provisional">Allow IEA Provisional Data</Label>
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Total Electricity Amount</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="use_recs"
                    checked={!!formData.recs}
                    onCheckedChange={toggleRECs}
                  />
                  <Label htmlFor="use_recs">Include RECs</Label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="energy">Energy Amount</Label>
                  <Input
                    id="energy"
                    name="energy"
                    type="number"
                    value={formData.amount.energy}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="energy_unit">Energy Unit</Label>
                  <Input
                    id="energy_unit"
                    name="energy_unit"
                    value={formData.amount.energy_unit}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {formData.recs && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Label className="mb-2 block">Renewable Energy Certificates (RECs)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recs_energy">RECs Amount</Label>
                      <Input
                        id="recs_energy"
                        name="recs_energy"
                        type="number"
                        value={formData.recs.energy}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recs_energy_unit">RECs Unit</Label>
                      <Input
                        id="recs_energy_unit"
                        name="recs_energy_unit"
                        value={formData.recs.energy_unit}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div>
              <div className="flex justify-between items-center mb-4">
                <Label>Electricity Components</Label>
                <Button type="button" variant="outline" size="sm" onClick={addComponent}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Component
                </Button>
              </div>

              <div className="space-y-6">
                {formData.components.map((component, index) => (
                  <div key={index} className="p-4 border border-slate-200 dark:border-slate-700 rounded-md">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Component {index + 1}</h4>
                      {formData.components.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeComponent(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <Label>Energy Amount</Label>
                        <Input
                          type="number"
                          value={component.amount.energy}
                          onChange={(e) => handleComponentChange(index, 'energy', e.target.value)}
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Energy Unit</Label>
                        <Input
                          value={component.amount.energy_unit}
                          onChange={(e) => handleComponentChange(index, 'energy_unit', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Connection Type</Label>
                        <Select
                          value={component.connection_type}
                          onValueChange={(value) => handleComponentChange(index, 'connection_type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select connection type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="grid">Grid</SelectItem>
                            <SelectItem value="direct">Direct</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {component.connection_type === 'grid' ? (
                        <div className="space-y-2">
                          <Label>Supplier (optional)</Label>
                          <Input
                            value={component.supplier || ''}
                            onChange={(e) => handleComponentChange(index, 'supplier', e.target.value)}
                            placeholder="e.g. british_gas"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label>Energy Source (optional)</Label>
                            <Input
                              value={component.energy_source || ''}
                              onChange={(e) => handleComponentChange(index, 'energy_source', e.target.value)}
                              placeholder="e.g. natural_gas, renewable"
                            />
                          </div>
                          <div className="space-y-2 col-span-2">
                            <Label>Loss Factor (optional)</Label>
                            <Input
                              type="number"
                              value={component.loss_factor || ''}
                              onChange={(e) => handleComponentChange(index, 'loss_factor', e.target.value)}
                              placeholder="e.g. 0.05"
                              min="0"
                              max="1"
                              step="0.01"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Calculating...' : 'Calculate Emissions'}
            </Button>
          </form>
        </CardContent>
        {result && (
          <CardFooter className="flex flex-col items-start">
            <h3 className="text-lg font-semibold mb-2">Results</h3>
            <div className="w-full space-y-6">
              <div>
                <h4 className="text-md font-semibold mb-2">Location-based Reporting</h4>
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm font-medium">Consumption (Scope 2):</div>
                    <div className="text-sm">
                      {result.location.consumption.co2e} {result.location.consumption.co2e_unit}
                    </div>
                    <div className="text-sm font-medium">T&D Losses (Scope 3):</div>
                    <div className="text-sm">
                      {result.location.transmission_and_distribution.co2e} {result.location.transmission_and_distribution.co2e_unit}
                    </div>
                    <div className="text-sm font-medium">Well-to-Tank (Scope 3):</div>
                    <div className="text-sm">
                      {result.location.well_to_tank.co2e} {result.location.well_to_tank.co2e_unit}
                    </div>
                    <div className="text-sm font-medium">WTT of T&D Losses (Scope 3):</div>
                    <div className="text-sm">
                      {result.location.well_to_tank_of_transmission_and_distribution.co2e}{' '}
                      {result.location.well_to_tank_of_transmission_and_distribution.co2e_unit}
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-md font-semibold mb-2">Market-based Reporting</h4>
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm font-medium">Consumption (Scope 2):</div>
                    <div className="text-sm">
                      {result.market.consumption.co2e} {result.market.consumption.co2e_unit}
                    </div>
                    <div className="text-sm font-medium">T&D Losses (Scope 3):</div>
                    <div className="text-sm">
                      {result.market.transmission_and_distribution.co2e} {result.market.transmission_and_distribution.co2e_unit}
                    </div>
                    <div className="text-sm font-medium">Well-to-Tank (Scope 3):</div>
                    <div className="text-sm">
                      {result.market.well_to_tank.co2e} {result.market.well_to_tank.co2e_unit}
                    </div>
                    <div className="text-sm font-medium">WTT of T&D Losses (Scope 3):</div>
                    <div className="text-sm">
                      {result.market.well_to_tank_of_transmission_and_distribution.co2e}{' '}
                      {result.market.well_to_tank_of_transmission_and_distribution.co2e_unit}
                    </div>
                  </div>
                </div>
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