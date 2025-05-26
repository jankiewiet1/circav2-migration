
import { useCallback } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
}

export const FileUploadZone = ({ onFileSelect }: FileUploadZoneProps) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls', '.xlsx'],
    },
    maxFiles: 1
  });

  return (
    <div 
      {...getRootProps()} 
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors
        ${isDragActive ? 'border-circa-green bg-circa-green-light/20' : 'border-gray-200 hover:border-circa-green'}`}
    >
      <input {...getInputProps()} />
      <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          {isDragActive ? 'Drop your file here' : 'Drag and drop your file here, or click to browse'}
        </p>
        <p className="text-xs text-gray-500">Supported formats: .xlsx, .xls, .csv</p>
      </div>
    </div>
  );
};
