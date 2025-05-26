
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Flame, Wind, Truck } from "lucide-react";

interface PreviewData {
  headers: string[];
  rows: string[][];
  detectedScope?: '1' | '2' | '3';
}

const ScopeIcon = ({ scope }: { scope?: '1' | '2' | '3' }) => {
  switch (scope) {
    case '1':
      return <Flame className="h-4 w-4" />;
    case '2':
      return <Wind className="h-4 w-4" />;
    case '3':
      return <Truck className="h-4 w-4" />;
    default:
      return null;
  }
};

export const ScopeDetectionPreview = ({ headers, rows, detectedScope }: PreviewData) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Data Preview</CardTitle>
          {detectedScope && (
            <Badge variant="outline" className="flex items-center gap-1">
              <ScopeIcon scope={detectedScope} />
              Scope {detectedScope}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((header, i) => (
                  <TableHead key={i}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 5).map((row, i) => (
                <TableRow key={i}>
                  {row.map((cell, j) => (
                    <TableCell key={j}>{cell}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
