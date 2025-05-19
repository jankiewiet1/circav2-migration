
import { Badge } from "@/components/ui/badge";

type ReportStatus = "Completed" | "Scheduled" | "Draft";

interface ReportStatusBadgeProps {
  status: ReportStatus;
}

export const ReportStatusBadge = ({ status }: ReportStatusBadgeProps) => {
  const variants: Record<ReportStatus, string> = {
    Completed: "bg-green-100 text-green-800 border-green-200",
    Scheduled: "bg-orange-100 text-orange-800 border-orange-200",
    Draft: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <Badge className={`${variants[status]} border`}>
      {status}
    </Badge>
  );
};
