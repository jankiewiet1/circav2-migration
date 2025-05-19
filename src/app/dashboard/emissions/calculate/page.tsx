import { Metadata } from "next";
import EmissionCalculator from "@/components/emission-calculator/EmissionCalculator";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Carbon Emission Calculator",
  description: "Calculate your carbon emissions with the Climatiq API",
};

export default function EmissionCalculatorPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Carbon Emission Calculator
          </h1>
          <p className="text-sm text-muted-foreground">
            Calculate your carbon emissions using the Climatiq API
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/emissions">
            View Emissions
          </Link>
        </Button>
      </div>

      <EmissionCalculator />
    </div>
  );
} 