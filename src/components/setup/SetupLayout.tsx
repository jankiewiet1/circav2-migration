
import { ReactNode } from "react";
import { MainLayout } from "@/components/MainLayout";
import { Progress } from "@/components/ui/progress";

interface SetupLayoutProps {
  children: ReactNode;
  currentStep: number;
  totalSteps: number;
  title: string;
  description: string;
}

export function SetupLayout({ 
  children, 
  currentStep, 
  totalSteps, 
  title, 
  description 
}: SetupLayoutProps) {
  const progressPercentage = (currentStep / totalSteps) * 100;
  
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-2">
            <h1 className="text-3xl font-bold">{title}</h1>
            <span className="text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </span>
          </div>
          <p className="text-muted-foreground mb-4">{description}</p>
          <Progress value={progressPercentage} className="h-2" />
        </div>
        
        {children}
      </div>
    </MainLayout>
  );
}
