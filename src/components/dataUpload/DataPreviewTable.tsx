import React, { useState } from 'react';
import { DataEntry, AIFieldMapping } from '@/types/dataEntry';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DataPreviewTableProps {
  data: Partial<DataEntry>[];
  mappings: AIFieldMapping[];
}

export const DataPreviewTable: React.FC<DataPreviewTableProps> = ({
  data,
  mappings,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const rowsPerPage = 10;
  
  // Calculate total pages
  const totalPages = Math.ceil(data.length / rowsPerPage);
  
  // Get current page data
  const paginatedData = data.slice(
    currentPage * rowsPerPage,
    (currentPage + 1) * rowsPerPage
  );
  
  // Get field display order
  const displayFields = mappings
    .filter(mapping => mapping.mapped_field)
    .sort((a, b) => {
      // Sort by confidence (high to low)
      return b.confidence - a.confidence;
    })
    .map(mapping => ({
      originalHeader: mapping.original_header,
      fieldName: mapping.mapped_field,
      confidence: mapping.confidence,
    }));
  
  // Render confidence indicator
  const renderConfidenceIndicator = (confidence: number) => {
    if (confidence >= 0.8) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p>High confidence</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    } else if (confidence >= 0.5) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-amber-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Medium confidence</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    } else {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Low confidence</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
  };
  
  // Handle pagination
  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  return (
    <div className="border rounded-md">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell className="w-12 text-center font-medium">#</TableCell>
              {displayFields.map((field, index) => (
                <TableCell key={index} className="relative whitespace-nowrap">
                  <div className="flex items-center space-x-1">
                    {renderConfidenceIndicator(field.confidence)}
                    <span>{field.originalHeader}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {field.fieldName.toString()}
                  </div>
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  <TableCell className="text-center text-sm text-gray-500">
                    {currentPage * rowsPerPage + rowIndex + 1}
                  </TableCell>
                  {displayFields.map((field, cellIndex) => {
                    // @ts-ignore - Dynamic access
                    const cellValue = row[field.fieldName];
                    
                    // Get background color based on confidence
                    let bgColor = '';
                    if (field.confidence < 0.5) {
                      bgColor = 'bg-red-50';
                    } else if (field.confidence < 0.8) {
                      bgColor = 'bg-amber-50';
                    }
                    
                    return (
                      <TableCell
                        key={cellIndex}
                        className={`${bgColor} whitespace-nowrap`}
                      >
                        {cellValue !== undefined && cellValue !== null
                          ? String(cellValue)
                          : '-'}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={displayFields.length + 1}
                  className="h-24 text-center"
                >
                  No data to display
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t">
          <div className="text-sm text-gray-500">
            Showing {currentPage * rowsPerPage + 1} to{' '}
            {Math.min((currentPage + 1) * rowsPerPage, data.length)} of {data.length} entries
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 py-1 text-sm">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}; 