
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const TrustBadges = () => {
  const badges = [
    {
      label: "CDP Ready",
      tooltip: "Automatically generate CDP-compliant reports",
      variant: "blue"
    },
    {
      label: "GHG Protocol",
      tooltip: "Following the Greenhouse Gas Protocol standards",
      variant: "green"
    },
    {
      label: "ISO 14064",
      tooltip: "Aligned with ISO 14064 reporting standards",
      variant: "purple"
    },
    {
      label: "Audit Friendly",
      tooltip: "Complete data trails for third-party verification",
      variant: "orange"
    }
  ];

  const getVariantClass = (variant: string) => {
    const variants: Record<string, string> = {
      blue: "bg-blue-100 text-blue-800 border-blue-200",
      green: "bg-green-100 text-green-800 border-green-200",
      purple: "bg-purple-100 text-purple-800 border-purple-200",
      orange: "bg-orange-100 text-orange-800 border-orange-200"
    };
    
    return variants[variant] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <TooltipProvider>
        {badges.map((badge, index) => (
          <Tooltip key={index}>
            <TooltipTrigger>
              <Badge className={`border ${getVariantClass(badge.variant)} py-1.5 px-3 text-sm font-medium cursor-help`}>
                {badge.label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{badge.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
};
