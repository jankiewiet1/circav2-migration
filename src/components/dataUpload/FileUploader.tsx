import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Image, Table, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  isProcessing: boolean;
  acceptedFileTypes?: string;
  maxFileSize?: number; // in MB
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesSelected,
  isProcessing,
  acceptedFileTypes = '.csv,.xlsx,.pdf,.jpg,.png',
  maxFileSize = 10, // 10MB by default
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection from input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      validateAndAddFiles(fileList);
    }
  };

  // Handle file drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      const fileList = Array.from(e.dataTransfer.files);
      validateAndAddFiles(fileList);
    }
  };

  // Validate and add files to the selected files state
  const validateAndAddFiles = (fileList: File[]) => {
    const validFiles: File[] = [];
    const invalidFiles: { name: string; reason: string }[] = [];
    
    // Check if accepted file types is provided
    const acceptedExtensions = acceptedFileTypes
      .split(',')
      .map(type => type.trim().toLowerCase());
    
    for (const file of fileList) {
      // Check file size
      if (file.size > maxFileSize * 1024 * 1024) {
        invalidFiles.push({
          name: file.name,
          reason: `Exceeds max size of ${maxFileSize}MB`
        });
        continue;
      }
      
      // Check file type
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      const fileType = file.type.toLowerCase();
      
      const isAcceptedExtension = acceptedExtensions.some(ext => 
        ext === fileExtension || ext === '*' || ext === '.*'
      );
      
      const isAcceptedMimeType = acceptedExtensions.some(ext => {
        if (ext === '.csv' && fileType === 'text/csv') return true;
        if (ext === '.xlsx' && fileType.includes('spreadsheet')) return true;
        if (ext === '.pdf' && fileType === 'application/pdf') return true;
        if ((ext === '.jpg' || ext === '.jpeg') && fileType === 'image/jpeg') return true;
        if (ext === '.png' && fileType === 'image/png') return true;
        return false;
      });
      
      if (isAcceptedExtension || isAcceptedMimeType) {
        validFiles.push(file);
      } else {
        invalidFiles.push({
          name: file.name,
          reason: 'File type not supported'
        });
      }
    }
    
    // Show error for invalid files
    if (invalidFiles.length > 0) {
      invalidFiles.forEach(file => {
        toast.error(`${file.name}: ${file.reason}`);
      });
    }
    
    // Add valid files to state
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  // Remove a file from the selected files
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle the upload button click
  const handleUpload = () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }
    
    onFilesSelected(selectedFiles);
    // We don't clear the files immediately to show upload progress
    // They will be cleared after processing is complete
  };

  // Get icon based on file type
  const getFileIcon = (file: File) => {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();
    
    if (type.includes('csv') || name.endsWith('.csv')) {
      return <Table className="h-8 w-8 text-green-600" />;
    } else if (type.includes('sheet') || name.endsWith('.xlsx') || name.endsWith('.xls')) {
      return <Table className="h-8 w-8 text-green-600" />;
    } else if (type.includes('pdf')) {
      return <FileText className="h-8 w-8 text-red-600" />;
    } else if (type.includes('image')) {
      return <Image className="h-8 w-8 text-blue-600" />;
    }
    
    return <FileText className="h-8 w-8 text-gray-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer text-center
          ${isDragging ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-500'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          multiple
          accept={acceptedFileTypes}
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={isProcessing}
        />
        
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-base font-medium text-gray-700">
          Drag and drop files here, or click to browse
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Supported formats: CSV, Excel, PDF, Images
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Max file size: {maxFileSize}MB
        </p>
      </div>
      
      {/* Selected files list */}
      {selectedFiles.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">Selected Files ({selectedFiles.length})</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {selectedFiles.map((file, index) => (
              <div 
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 rounded-md bg-gray-50 border"
              >
                <div className="flex items-center space-x-3">
                  {getFileIcon(file)}
                  <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isProcessing}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Upload button */}
      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          onClick={() => setSelectedFiles([])}
          disabled={selectedFiles.length === 0 || isProcessing}
        >
          Clear All
        </Button>
        <Button
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || isProcessing}
          className="min-w-[120px]"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Upload Files'
          )}
        </Button>
      </div>
    </div>
  );
}; 