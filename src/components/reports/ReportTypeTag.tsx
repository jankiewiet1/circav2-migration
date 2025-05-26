
import { Badge } from "@/components/ui/badge";

type ReportType = "GHG" | "CDP" | "Annual" | "Quarterly" | "Custom";

interface ReportTypeTagProps {
  type: ReportType;
}

export const ReportTypeTag = ({ type }: ReportTypeTagProps) => {
  const variants: Record<ReportType, string> = {
    GHG: "bg-circa-green text-white",
    CDP: "bg-blue-600 text-white",
    Annual: "bg-purple-600 text-white",
    Quarterly: "bg-indigo-600 text-white",
    Custom: "bg-gray-600 text-white",
  };

  return (
    <Badge className={variants[type]}>
      {type}
    </Badge>
  );
};
