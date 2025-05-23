import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataEntryInsert, DataEntrySourceType, GHGCategory } from "@/types/dataEntry";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Loader2 } from "lucide-react";

interface ManualEntryFormProps {
  onEntryCreated?: () => void;
}

export const ManualEntryForm: React.FC<ManualEntryFormProps> = ({ onEntryCreated }) => {
  const { company } = useCompany();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize with default values
  const [formData, setFormData] = useState<Partial<DataEntryInsert>>({
    date: new Date().toISOString().split('T')[0],
    source_type: 'manual entry',  // This will be auto-set and not shown to the user
    activity_description: '',
    quantity: 0,
    unit: '',
    ghg_category: 'Scope 1',
    status: 'raw',
    ai_processed: false
  });

  // Units commonly used in carbon accounting
  const commonUnits = [
    { value: 'kWh', label: 'Kilowatt-hour (kWh)' },
    { value: 'MWh', label: 'Megawatt-hour (MWh)' },
    { value: 'GJ', label: 'Gigajoule (GJ)' },
    { value: 'liters', label: 'Liters (L)' },
    { value: 'gallons', label: 'Gallons (gal)' },
    { value: 'kg', label: 'Kilograms (kg)' },
    { value: 'tonnes', label: 'Tonnes (t)' },
    { value: 'km', label: 'Kilometers (km)' },
    { value: 'miles', label: 'Miles (mi)' },
    { value: 'ft3', label: 'Cubic feet (ft³)' },
    { value: 'm3', label: 'Cubic meters (m³)' },
  ];

  // Categories for activity types
  const categories = [
    // Scope 1
    { value: 'stationary_combustion', label: 'Stationary Combustion', scope: 'Scope 1' },
    { value: 'mobile_combustion', label: 'Mobile Combustion', scope: 'Scope 1' },
    { value: 'refrigerants', label: 'Refrigerants', scope: 'Scope 1' },
    { value: 'process_emissions', label: 'Process Emissions', scope: 'Scope 1' },
    
    // Scope 2
    { value: 'purchased_electricity', label: 'Purchased Electricity', scope: 'Scope 2' },
    { value: 'purchased_heating', label: 'Purchased Heating', scope: 'Scope 2' },
    { value: 'purchased_cooling', label: 'Purchased Cooling', scope: 'Scope 2' },
    { value: 'purchased_steam', label: 'Purchased Steam', scope: 'Scope 2' },
    
    // Scope 3
    { value: 'business_travel', label: 'Business Travel', scope: 'Scope 3' },
    { value: 'employee_commuting', label: 'Employee Commuting', scope: 'Scope 3' },
    { value: 'waste_disposal', label: 'Waste Disposal', scope: 'Scope 3' },
    { value: 'purchased_goods_services', label: 'Purchased Goods & Services', scope: 'Scope 3' },
    { value: 'transportation_distribution', label: 'Transportation & Distribution', scope: 'Scope 3' },
    { value: 'fuel_energy_activities', label: 'Fuel & Energy Activities', scope: 'Scope 3' },
  ];

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Convert numeric values
    if (type === 'number') {
      setFormData({
        ...formData,
        [name]: parseFloat(value) || 0
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Handle select input changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
    
    // If changing ghg_category, optionally reset activity_category
    if (name === 'ghg_category') {
      setFormData(prev => ({
        ...prev,
        [name]: value as GHGCategory
      }));
    }
  };

  // Submit the form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!company) {
      toast.error("No company context available");
      return;
    }
    
    console.log("Starting form submission with company ID:", company.id);
    
    // Validate required fields
    const requiredFields = ['date', 'activity_description', 'quantity', 'unit', 'ghg_category'];
    const missingFields = requiredFields.filter(field => 
      !formData[field as keyof typeof formData]
    );
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    // Additional validations
    if (formData.quantity! <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Ensure we have a valid company ID
      if (!company.id) {
        throw new Error("Missing company ID");
      }

      // Get scope number from GHG category
      const scopeNumber = formData.ghg_category === 'Scope 1' ? 1 : 
                         formData.ghg_category === 'Scope 2' ? 2 : 3;
      
      // Format date properly
      const formattedDate = formData.date ? new Date(formData.date).toISOString().split('T')[0] : 
                           new Date().toISOString().split('T')[0];

      // SIMPLIFIED APPROACH: Direct insert with disabled trigger
      console.log("Using simplified direct insert approach");
      
      // Create the entry with match_status to bypass trigger
      const emissionEntry = {
        company_id: company.id,
        date: formattedDate,
        category: formData.activity_description?.trim() || 'Uncategorized',
        description: formData.activity_description?.trim() || 'No description',
        quantity: Number(formData.quantity) || 0,
        unit: formData.unit?.trim() || '',
        scope: scopeNumber,
        notes: formData.notes?.trim() || null,
        match_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Direct insert into emission_entries table
      const { data: newEntry, error } = await supabase
        .from('emission_entries')
        .insert([emissionEntry])
        .select()
        .single();
        
      if (error) {
        console.error("Insert error:", error);
        throw new Error(`Error saving to emission_entries: ${error.message}`);
      }
      
      console.log("Successfully inserted entry:", newEntry);
      toast.success("Data entry saved successfully");
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        source_type: 'manual entry',
        activity_description: '',
        quantity: 0,
        unit: '',
        ghg_category: 'Scope 1',
        status: 'raw',
        ai_processed: false
      });
      
      // Notify parent component
      if (onEntryCreated) {
        console.log("Calling onEntryCreated callback");
        onEntryCreated();
      }
    } catch (error) {
      console.error('Error saving data entry:', error);
      
      // More detailed error handling
      if (error instanceof Error) {
        toast.error(`Failed to save entry: ${error.message}`);
      } else {
        toast.error('An unknown error occurred while saving data');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date Field */}
              <div className="space-y-2">
                <Label htmlFor="date" className="font-medium">Date <span className="text-red-500">*</span></Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  className="focus:border-emerald-500"
                />
              </div>
              
              {/* Hidden source type - no longer displayed to user */}
              <input 
                type="hidden" 
                name="source_type" 
                value="manual entry" 
              />
            </div>
          </div>
          
          {/* Activity Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800">Activity Details</h3>
            
            <div className="space-y-2">
              <Label htmlFor="activity_description" className="font-medium">Activity Description <span className="text-red-500">*</span></Label>
              <Textarea
                id="activity_description"
                name="activity_description"
                placeholder="Describe the activity (e.g. Electricity consumption, Diesel fuel usage)"
                value={formData.activity_description}
                onChange={handleInputChange}
                required
                className="min-h-[80px] focus:border-emerald-500"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quantity Field */}
              <div className="space-y-2">
                <Label htmlFor="quantity" className="font-medium">Quantity <span className="text-red-500">*</span></Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.quantity === 0 ? '' : formData.quantity}
                  onChange={handleInputChange}
                  required
                  className="focus:border-emerald-500"
                />
              </div>
              
              {/* Unit Field */}
              <div className="space-y-2">
                <Label htmlFor="unit" className="font-medium">Unit <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => handleSelectChange('unit', value)}
                >
                  <SelectTrigger id="unit" className="focus:border-emerald-500">
                    <SelectValue placeholder="Select a unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonUnits.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {formData.unit === 'other' && (
              <div className="space-y-2">
                <Label htmlFor="custom_unit">Custom Unit <span className="text-red-500">*</span></Label>
                <Input
                  id="custom_unit"
                  name="unit"
                  placeholder="Enter custom unit"
                  value={formData.unit === 'other' ? '' : formData.unit}
                  onChange={handleInputChange}
                  required
                  className="focus:border-emerald-500"
                />
              </div>
            )}
          </div>
          
          {/* Categorization Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800">Categorization</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* GHG Category Field */}
              <div className="space-y-2">
                <Label htmlFor="ghg_category" className="font-medium">GHG Category <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.ghg_category}
                  onValueChange={(value) => handleSelectChange('ghg_category', value as GHGCategory)}
                >
                  <SelectTrigger id="ghg_category" className="focus:border-emerald-500">
                    <SelectValue placeholder="Select scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Scope 1">Scope 1 - Direct Emissions</SelectItem>
                    <SelectItem value="Scope 2">Scope 2 - Indirect Emissions from Electricity</SelectItem>
                    <SelectItem value="Scope 3">Scope 3 - Other Indirect Emissions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Supplier/Vendor Field */}
              <div className="space-y-2">
                <Label htmlFor="supplier_vendor">Supplier/Vendor</Label>
                <Input
                  id="supplier_vendor"
                  name="supplier_vendor"
                  placeholder="Enter supplier or vendor name"
                  value={formData.supplier_vendor || ''}
                  onChange={handleInputChange}
                  className="focus:border-emerald-500"
                />
              </div>
            </div>
            
            {/* Cost Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="cost">Cost (Optional)</Label>
                <Input
                  id="cost"
                  name="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter cost amount"
                  value={formData.cost || ''}
                  onChange={handleInputChange}
                  className="focus:border-emerald-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => handleSelectChange('currency', value)}
                >
                  <SelectTrigger id="currency" className="focus:border-emerald-500">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                    <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                    <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Additional Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800">Additional Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Add any additional notes or context"
                value={formData.notes || ''}
                onChange={handleInputChange}
                className="min-h-[80px] focus:border-emerald-500"
              />
            </div>
          </div>
          
          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="px-8 bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Entry'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}; 