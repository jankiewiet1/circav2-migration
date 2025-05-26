import React from "react";
import { MainLayout } from "@/components/MainLayout";
import { EnhancedChatBot } from "@/components/help/EnhancedChatBot";
import { EmailFallback } from "@/components/help/EmailFallback";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronRight } from "lucide-react";

const Help = () => {
  const isMobile = useIsMobile();

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
          <span>Home</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">Help</span>
        </div>

        <h1 className="text-3xl font-bold mb-6">Help</h1>
        
        <div className={`grid ${isMobile ? "grid-cols-1 gap-8" : "grid-cols-12 gap-8"}`}>
          <div className={isMobile ? "" : "col-span-8"}>
            <EnhancedChatBot />
          </div>
          <div className={isMobile ? "" : "col-span-4"}>
            <EmailFallback />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Help;
