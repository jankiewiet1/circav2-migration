import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, HelpCircle, Edit2 } from "lucide-react";
import { DataEntry, AIFieldMapping } from '@/types/dataEntry';

interface DataValidationPanelProps {
  data: Partial<DataEntry>[];
  mappings: AIFieldMapping[];
  onValidate: (validatedData: Partial<DataEntry>[]) => void;
  onReject: () => void;
}

export const DataValidationPanel: React.FC<DataValidationPanelProps> = ({
  data,
  mappings,
  onValidate,
  onReject
}) => {
  const [validatedData, setValidatedData] = useState<Partial<DataEntry>[]>(data);
  const [editingCell, setEditingCell] = useState<{rowIndex: number; field: keyof DataEntry} | null>(null);
  
  // Get a list of fields that have been mapped
  const mappedFields = mappings
    .filter(m => m.mapped_field && m.confidence > 0)
    .map(m => m.mapped_field) as (keyof DataEntry)[];
  
  // Add essential fields that might not be in mappings
  const essentialFields: (keyof DataEntry)[] = [
    'date',
    'activity_description',
    'quantity',
    'unit',
    'ghg_category'
  ];
  
  // Combine and deduplicate fields
  const fieldsToDisplay = Array.from(new Set([...mappedFields, ...essentialFields]));
  
  // Get confidence for a field based on mappings
  const getFieldConfidence = (field: keyof DataEntry): number => {
    const mapping = mappings.find(m => m.mapped_field === field);
    return mapping ? mapping.confidence : 0.5;
  };
  
  // Render confidence indicator
  const renderConfidenceIndicator = (confidence: number) => {
    if (confidence >= 0.8) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (confidence >= 0.5) {
      return <HelpCircle className="h-4 w-4 text-amber-500" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };
  
  // Handle cell edit
  const handleCellEdit = (rowIndex: number, field: keyof DataEntry, value: any) => {
    const newData = [...validatedData];
    newData[rowIndex] = {
      ...newData[rowIndex],
      [field]: value
    };
    setValidatedData(newData);
  };
  
  // Handle validation and submission
  const handleValidate = () => {
    // Add validation status to each entry
    const finalData = validatedData.map(entry => ({
      ...entry,
      status: 'validated',
      ai_processed: true
    }));
    
    onValidate(finalData);
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center justify-between">
          <span>Data Validation</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onReject}>
              Reject
            </Button>
            <Button onClick={handleValidate}>
              Validate & Save
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-4">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm">High Confidence</span>
          </div>
          <div className="flex items-center gap-1">
            <HelpCircle className="h-4 w-4 text-amber-500" />
            <span className="text-sm">Medium Confidence</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm">Low Confidence</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {fieldsToDisplay.map(field => (
                  <TableHead key={field} className="whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span>{field.replace('_', ' ')}</span>
                      {renderConfidenceIndicator(getFieldConfidence(field))}
                    </div>
                  </TableHead>
                ))}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {validatedData.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {fieldsToDisplay.map(field => (
                    <TableCell key={`${rowIndex}-${field}`}>
                      {editingCell && editingCell.rowIndex === rowIndex && editingCell.field === field ? (
                        // Edit mode
                        field === 'ghg_category' ? (
                          <Select 
                            value={String(row[field]) || ''} 
                            onValueChange={(value) => {
                              handleCellEdit(rowIndex, field, value);
                              setEditingCell(null);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select scope" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Scope 1">Scope 1</SelectItem>
                              <SelectItem value="Scope 2">Scope 2</SelectItem>
                              <SelectItem value="Scope 3">Scope 3</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : field === 'unit' ? (
                          <Select 
                            value={String(row[field]) || ''} 
                            onValueChange={(value) => {
                              handleCellEdit(rowIndex, field, value);
                              setEditingCell(null);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="kWh">kWh</SelectItem>
                              <SelectItem value="liters">liters</SelectItem>
                              <SelectItem value="kg">kg</SelectItem>
                              <SelectItem value="tonnes">tonnes</SelectItem>
                              <SelectItem value="miles">miles</SelectItem>
                              <SelectItem value="km">km</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input 
                            value={String(row[field]) || ''} 
                            onChange={(e) => handleCellEdit(rowIndex, field, e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            autoFocus
                          />
                        )
                      ) : (
                        // Display mode
                        <div 
                          className="p-2 min-h-[2rem] cursor-pointer hover:bg-gray-100 rounded"
                          onClick={() => setEditingCell({rowIndex, field})}
                        >
                          {row[field] !== undefined ? String(row[field]) : '—'}
                        </div>
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        const firstField = fieldsToDisplay[0];
                        setEditingCell({rowIndex, field: firstField});
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {validatedData.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            No data available for validation
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 