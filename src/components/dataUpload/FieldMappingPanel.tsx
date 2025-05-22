import React from 'react';
import { AIFieldMapping } from '@/types/dataEntry';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface FieldMappingPanelProps {
  mappings: AIFieldMapping[];
  onMappingChange: (originalField: string, correctedField: string) => void;
  userCorrectedMappings: Record<string, string>;
}

export const FieldMappingPanel: React.FC<FieldMappingPanelProps> = ({
  mappings,
  onMappingChange,
  userCorrectedMappings,
}) => {
  // Get all unique possible field mappings for dropdown
  const allPossibleFields = [
    'date',
    'source_type',
    'supplier_vendor',
    'activity_description',
    'quantity',
    'unit',
    'currency',
    'cost',
    'ghg_category',
    'notes',
  ];
  
  // Group mappings by confidence level
  const highConfidenceMappings = mappings.filter(m => m.confidence >= 0.8);
  const mediumConfidenceMappings = mappings.filter(m => m.confidence >= 0.5 && m.confidence < 0.8);
  const lowConfidenceMappings = mappings.filter(m => m.confidence < 0.5);
  
  // Render a mapping field with confidence indicator
  const renderMapping = (mapping: AIFieldMapping) => {
    // Get the current value (either user corrected or original)
    const currentValue = userCorrectedMappings[mapping.original_header] || 
      (mapping.mapped_field ? mapping.mapped_field.toString() : '');
    
    // Determine icon based on confidence
    let ConfidenceIcon;
    let iconColor;
    
    if (mapping.confidence >= 0.8) {
      ConfidenceIcon = CheckCircle2;
      iconColor = 'text-green-500';
    } else if (mapping.confidence >= 0.5) {
      ConfidenceIcon = HelpCircle;
      iconColor = 'text-amber-500';
    } else {
      ConfidenceIcon = AlertCircle;
      iconColor = 'text-red-500';
    }
    
    // Check if this field has been corrected by the user
    const isCorrected = Boolean(userCorrectedMappings[mapping.original_header]);
    
    return (
      <div key={mapping.original_header} className="mb-4">
        <div className="flex items-center mb-1">
          <ConfidenceIcon className={`h-4 w-4 ${iconColor} mr-2`} />
          <span className="text-sm font-medium">{mapping.original_header}</span>
          {isCorrected && (
            <Badge className="ml-2 bg-blue-500" variant="secondary">
              Corrected
            </Badge>
          )}
        </div>
        <Select
          value={currentValue}
          onValueChange={(value) => onMappingChange(mapping.original_header, value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select field mapping" />
          </SelectTrigger>
          <SelectContent>
            {allPossibleFields.map(field => (
              <SelectItem key={field} value={field}>
                {field.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {mapping.suggestions && mapping.suggestions.length > 0 && (
          <div className="mt-1 text-xs text-gray-500">
            Suggestions: {mapping.suggestions.join(', ')}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Field Mapping</CardTitle>
        <CardDescription>
          Review and correct AI-detected field mappings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          {/* High confidence mappings */}
          {highConfidenceMappings.length > 0 && (
            <>
              <div className="flex items-center mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                <h3 className="text-sm font-medium">High Confidence</h3>
              </div>
              {highConfidenceMappings.map(renderMapping)}
              <Separator className="my-4" />
            </>
          )}
          
          {/* Medium confidence mappings */}
          {mediumConfidenceMappings.length > 0 && (
            <>
              <div className="flex items-center mb-2">
                <HelpCircle className="h-4 w-4 text-amber-500 mr-2" />
                <h3 className="text-sm font-medium">Medium Confidence</h3>
                <Badge className="ml-2" variant="outline">
                  Review Needed
                </Badge>
              </div>
              {mediumConfidenceMappings.map(renderMapping)}
              <Separator className="my-4" />
            </>
          )}
          
          {/* Low confidence mappings */}
          {lowConfidenceMappings.length > 0 && (
            <>
              <div className="flex items-center mb-2">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                <h3 className="text-sm font-medium">Low Confidence</h3>
                <Badge className="ml-2 bg-red-100 text-red-800" variant="outline">
                  Correction Needed
                </Badge>
              </div>
              {lowConfidenceMappings.map(renderMapping)}
            </>
          )}
          
          {/* No mappings */}
          {mappings.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              No field mappings detected
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}; 