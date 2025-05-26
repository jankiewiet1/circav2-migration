
import { Download, Copy, Calendar, Archive } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ReportActionsProps {
  format: string;
  onDownload: () => void;
  onDuplicate: () => void;
  onSchedule: () => void;
  onArchive: () => void;
}

export const ReportActions = ({ format, onDownload, onDuplicate, onSchedule, onArchive }: ReportActionsProps) => {
  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            {format}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Download as {format}</p>
        </TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            More
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="h-4 w-4 mr-2" /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSchedule}>
            <Calendar className="h-4 w-4 mr-2" /> Schedule
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onArchive}>
            <Archive className="h-4 w-4 mr-2" /> Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
