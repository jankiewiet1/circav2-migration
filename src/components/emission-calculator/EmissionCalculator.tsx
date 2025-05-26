import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClimatiqEmissionService } from '@/services/emissionService';
import { EmissionSource, Scope } from '@/types/emissions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCompany } from '@/hooks/useCompany';

export default function EmissionCalculator() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('electricity');
  const { company } = useCompany();
  
  // Electricity state
  const [electricity, setElectricity] = useState({
    kwh: '',
    region: 'global'
  });
  
  // Transport state
  const [transport, setTransport] = useState({
    distance: '',
    mode: 'car',
    unit: 'km'
  });
  
  // Fuel state
  const [fuel, setFuel] = useState({
    quantity: '',
    type: 'diesel',
    unit: 'L'
  });

  /**
   * Handle electricity calculation submission
   */
  const handleElectricitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) {
      toast.error('Company information is required');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await ClimatiqEmissionService.calculateElectricityEmissions(
        parseFloat(electricity.kwh),
        electricity.region !== 'global' ? electricity.region : undefined
      );
      
      await ClimatiqEmissionService.saveEmissionData(result, company.id);
      toast.success(`Calculated emissions: ${result.co2e} ${result.co2e_unit}`);
    } catch (error: any) {
      console.error('Error calculating electricity emissions:', error);
      toast.error(error.message || 'Failed to calculate emissions');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle transport calculation submission
   */
  const handleTransportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) {
      toast.error('Company information is required');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await ClimatiqEmissionService.calculateTransportEmissions(
        parseFloat(transport.distance),
        transport.mode,
        transport.unit as 'km' | 'mi'
      );
      
      await ClimatiqEmissionService.saveEmissionData(result, company.id);
      toast.success(`Calculated emissions: ${result.co2e} ${result.co2e_unit}`);
    } catch (error: any) {
      console.error('Error calculating transport emissions:', error);
      toast.error(error.message || 'Failed to calculate emissions');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle fuel calculation submission
   */
  const handleFuelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) {
      toast.error('Company information is required');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await ClimatiqEmissionService.calculateFuelEmissions(
        parseFloat(fuel.quantity),
        fuel.type,
        fuel.unit as 'L' | 'gal'
      );
      
      await ClimatiqEmissionService.saveEmissionData(result, company.id);
      toast.success(`Calculated emissions: ${result.co2e} ${result.co2e_unit}`);
    } catch (error: any) {
      console.error('Error calculating fuel emissions:', error);
      toast.error(error.message || 'Failed to calculate emissions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Carbon Emission Calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="electricity">Electricity</TabsTrigger>
            <TabsTrigger value="transport">Transport</TabsTrigger>
            <TabsTrigger value="fuel">Fuel</TabsTrigger>
          </TabsList>
          
          {/* Electricity Tab */}
          <TabsContent value="electricity">
            <form onSubmit={handleElectricitySubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="kwh">Electricity consumption (kWh)</Label>
                <Input
                  id="kwh"
                  type="number"
                  placeholder="Enter consumption in kWh"
                  value={electricity.kwh}
                  onChange={(e) => setElectricity({ ...electricity, kwh: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Select
                  value={electricity.region}
                  onValueChange={(value) => setElectricity({ ...electricity, region: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global Average</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="GB">United Kingdom</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="DE">Germany</SelectItem>
                    <SelectItem value="FR">France</SelectItem>
                    <SelectItem value="CN">China</SelectItem>
                    <SelectItem value="IN">India</SelectItem>
                    <SelectItem value="JP">Japan</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Calculating...' : 'Calculate Emissions'}
              </Button>
            </form>
          </TabsContent>
          
          {/* Transport Tab */}
          <TabsContent value="transport">
            <form onSubmit={handleTransportSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="distance">Distance traveled</Label>
                <Input
                  id="distance"
                  type="number"
                  placeholder="Enter distance"
                  value={transport.distance}
                  onChange={(e) => setTransport({ ...transport, distance: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mode">Transportation mode</Label>
                <Select
                  value={transport.mode}
                  onValueChange={(value) => setTransport({ ...transport, mode: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="train">Train</SelectItem>
                    <SelectItem value="plane">Plane</SelectItem>
                    <SelectItem value="bus">Bus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="unit">Distance unit</Label>
                <Select
                  value={transport.unit}
                  onValueChange={(value) => setTransport({ ...transport, unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="km">Kilometers</SelectItem>
                    <SelectItem value="mi">Miles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Calculating...' : 'Calculate Emissions'}
              </Button>
            </form>
          </TabsContent>
          
          {/* Fuel Tab */}
          <TabsContent value="fuel">
            <form onSubmit={handleFuelSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Fuel quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="Enter quantity"
                  value={fuel.quantity}
                  onChange={(e) => setFuel({ ...fuel, quantity: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fuelType">Fuel type</Label>
                <Select
                  value={fuel.type}
                  onValueChange={(value) => setFuel({ ...fuel, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="petrol">Petrol/Gasoline</SelectItem>
                    <SelectItem value="naturalGas">Natural Gas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fuelUnit">Volume unit</Label>
                <Select
                  value={fuel.unit}
                  onValueChange={(value) => setFuel({ ...fuel, unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Liters</SelectItem>
                    <SelectItem value="gal">Gallons</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Calculating...' : 'Calculate Emissions'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 