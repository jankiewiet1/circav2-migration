
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface EmissionSourceSelectProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const EmissionSourceSelect = ({ value, onChange, disabled = false }: EmissionSourceSelectProps) => {
  const emissionSources = [
    { id: 'DEFRA', name: 'DEFRA (UK Department for Environment, Food and Rural Affairs)' },
    { id: 'EPA', name: 'EPA (US Environmental Protection Agency)' },
    { id: 'IPCC', name: 'IPCC (Intergovernmental Panel on Climate Change)' },
    { id: 'GHG Protocol', name: 'GHG Protocol' },
    { id: 'RIVM', name: 'RIVM (Netherlands National Institute for Public Health)' },
  ];

  return (
    <div className="space-y-2">
      <Label htmlFor="emission-source">Preferred Emission Factor Source</Label>
      <Select 
        value={value || 'DEFRA'} 
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full" id="emission-source">
          <SelectValue placeholder="Select emission factor source" />
        </SelectTrigger>
        <SelectContent>
          {emissionSources.map(source => (
            <SelectItem key={source.id} value={source.id}>
              {source.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Choose your preferred source for emission factors. This will be used for calculations.
      </p>
    </div>
  );
};

export default EmissionSourceSelect;
