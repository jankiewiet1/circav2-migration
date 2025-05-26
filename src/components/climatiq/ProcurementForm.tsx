import React, { useState } from 'react';
import {
  ProcurementRequest,
  ProcurementResponse,
  estimateProcurement,
  ProcurementItemRequest,
} from '../../integrations/climatiq';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from '../ui/use-toast';
import { PlusCircle, Trash2 } from 'lucide-react';

// Predefined currencies for dropdown
const CURRENCIES = [
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'JPY', label: 'Japanese Yen (JPY)' },
  { value: 'CNY', label: 'Chinese Yuan (CNY)' },
  { value: 'AUD', label: 'Australian Dollar (AUD)' },
  { value: 'CAD', label: 'Canadian Dollar (CAD)' },
];

// Template examples for common procurement items
const ITEM_TEMPLATES = [
  {
    name: 'Office Paper',
    description: 'Standard office paper for printing',
    category: 'paper',
    sector: 'services',
    region: 'GB',
    currency: 'GBP',
    money: 250,
  },
  {
    name: 'Laptops',
    description: 'New laptops for employees',
    category: 'computers',
    sector: 'technology',
    region: 'US',
    currency: 'USD',
    money: 5000,
  },
  {
    name: 'Office Furniture',
    description: 'Desks and chairs',
    category: 'office_furniture',
    sector: 'manufacturing',
    region: 'DE',
    currency: 'EUR',
    money: 10000,
  },
  {
    name: 'Cloud Hosting',
    description: 'Monthly cloud server costs',
    category: 'web_hosting',
    sector: 'services',
    region: 'GLOBAL',
    currency: 'USD',
    money: 1500,
  },
];

export function ProcurementForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProcurementResponse | null>(null);
  const [activeTab, setActiveTab] = useState('manual');
  
  const [items, setItems] = useState<ProcurementItemRequest[]>([
    {
      money: 1000,
      money_unit: 'EUR',
      category: 'accommodation-type_hotel-night_single',
      region: 'FR',
      data_version: '^21',
    },
  ]);

  const addItem = () => {
    setItems([
      ...items,
      {
        money: 500,
        money_unit: 'EUR',
        category: '',
        region: 'GLOBAL',
        data_version: '^21',
      },
    ]);
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    // Handle numeric fields
    if (field === 'money') {
      newItems[index] = {
        ...newItems[index],
        [field]: parseFloat(value as string),
      };
    } else {
      newItems[index] = {
        ...newItems[index],
        [field]: value,
      };
    }
    setItems(newItems);
  };

  const applyTemplate = (template: typeof ITEM_TEMPLATES[0]) => {
    setItems([
      ...items,
      {
        money: template.money,
        money_unit: template.currency,
        category: template.category,
        region: template.region,
        data_version: '^21',
        sector: template.sector,
        name: template.name,
        description: template.description,
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate items have required fields
      const invalidItems = items.filter((item) => !item.category || !item.money || !item.money_unit);
      
      if (invalidItems.length > 0) {
        toast({
          title: 'Validation Error',
          description: 'All items must have a category, money amount, and currency specified.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const request: ProcurementRequest = {
        items: items,
      };

      const response = await estimateProcurement(request);
      setResult(response);
      toast({
        title: 'Calculation Complete',
        description: `Total emissions: ${response.total.co2e} ${response.total.co2e_unit}`,
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
          <CardTitle>Procurement Emissions Calculator</CardTitle>
          <CardDescription>
            Calculate emissions from purchased goods and services based on spend data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="manual" onValueChange={setActiveTab} value={activeTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manual">
              <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Procurement Items</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-6">
                  {items.map((item, index) => (
                    <div key={index} className="p-4 border border-slate-200 dark:border-slate-700 rounded-md">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium">Item {index + 1}</h4>
                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Name (optional)</Label>
                            <Input
                              value={item.name || ''}
                              onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                              placeholder="e.g. Office Paper"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Description (optional)</Label>
                            <Input
                              value={item.description || ''}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              placeholder="e.g. Monthly office paper supplies"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Category (required)</Label>
                            <Input
                              value={item.category}
                              onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                              placeholder="e.g. paper, computers, office_furniture"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Sector (optional)</Label>
                            <Input
                              value={item.sector || ''}
                              onChange={(e) => handleItemChange(index, 'sector', e.target.value)}
                              placeholder="e.g. manufacturing, services, technology"
                            />
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Amount</Label>
                            <Input
                              type="number"
                              value={item.money}
                              onChange={(e) => handleItemChange(index, 'money', e.target.value)}
                              placeholder="e.g. 1000"
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Currency</Label>
                            <Select
                              value={item.money_unit}
                              onValueChange={(value) => handleItemChange(index, 'money_unit', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                              <SelectContent>
                                {CURRENCIES.map(currency => (
                                  <SelectItem key={currency.value} value={currency.value}>
                                    {currency.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Region</Label>
                            <Input
                              value={item.region}
                              onChange={(e) => handleItemChange(index, 'region', e.target.value)}
                              placeholder="e.g. GB, US, GLOBAL"
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Data Version</Label>
                            <Input
                              value={item.data_version}
                              onChange={(e) => handleItemChange(index, 'data_version', e.target.value)}
                              placeholder="e.g. ^21"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Year (optional)</Label>
                            <Input
                              type="number"
                              value={item.year || ''}
                              onChange={(e) => handleItemChange(index, 'year', e.target.value ? parseInt(e.target.value) : '')}
                              placeholder="e.g. 2023"
                              min="2000"
                              max="2030"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Calculating...' : 'Calculate Emissions'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="templates">
              <div className="space-y-6 mt-4">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Choose from these templates to quickly add common procurement items to your calculation.
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  {ITEM_TEMPLATES.map((template, index) => (
                    <Card key={index} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900">
                      <CardHeader className="p-4">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription>{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="font-medium">Category:</span>
                            <span>{template.category}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Sector:</span>
                            <span>{template.sector}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Region:</span>
                            <span>{template.region}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Amount:</span>
                            <span>{template.money} {template.currency}</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <Button onClick={() => {
                          applyTemplate(template);
                          setActiveTab('manual');
                        }} variant="outline" className="w-full">
                          Add to Calculation
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
                
                <div className="flex justify-center mt-4">
                  <Button onClick={() => setActiveTab('manual')} variant="default">
                    Go to Manual Entry
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        
        {result && (
          <CardFooter className="flex flex-col items-start">
            <h3 className="text-lg font-semibold mb-2">Results</h3>
            <div className="w-full space-y-6">
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium">Total Emissions:</div>
                  <div className="text-sm">
                    {result.total.co2e} {result.total.co2e_unit}
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-md font-semibold mb-2">Item Breakdown</h4>
                <div className="space-y-4">
                  {result.items.map((item, index) => (
                    <div key={index} className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm font-medium">Item:</div>
                        <div className="text-sm">{items[index].name || `Item ${index + 1}`}</div>
                        
                        <div className="text-sm font-medium">Category:</div>
                        <div className="text-sm">{items[index].category}</div>
                        
                        <div className="text-sm font-medium">Spend:</div>
                        <div className="text-sm">
                          {items[index].money} {items[index].money_unit}
                        </div>
                        
                        <div className="text-sm font-medium">Emissions:</div>
                        <div className="text-sm">
                          {item.co2e} {item.co2e_unit}
                        </div>
                        
                        {item.emission_factor && (
                          <>
                            <div className="text-sm font-medium">Emission Factor:</div>
                            <div className="text-sm">{item.emission_factor.name || 'Not available'}</div>
                            
                            <div className="text-sm font-medium">Source:</div>
                            <div className="text-sm">{item.emission_factor.source || 'Not available'}</div>
                          </>
                        )}
                      </div>
                      
                      {item.constituent_gases && (
                        <div className="mt-4">
                          <h5 className="text-sm font-semibold mb-2">Constituent Gases</h5>
                          <div className="grid grid-cols-2 gap-2">
                            {item.constituent_gases.co2 !== null && (
                              <>
                                <div className="text-sm font-medium">CO2:</div>
                                <div className="text-sm">{item.constituent_gases.co2} kg</div>
                              </>
                            )}
                            {item.constituent_gases.ch4 !== null && (
                              <>
                                <div className="text-sm font-medium">CH4:</div>
                                <div className="text-sm">{item.constituent_gases.ch4} kg</div>
                              </>
                            )}
                            {item.constituent_gases.n2o !== null && (
                              <>
                                <div className="text-sm font-medium">N2O:</div>
                                <div className="text-sm">{item.constituent_gases.n2o} kg</div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
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