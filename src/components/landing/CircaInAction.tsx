
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import dashboardImage from '@/assets/dashboard.png';

export function CircaInAction() {
  return (
    <section className="py-16 bg-muted">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Circa in Action</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            See how organizations are leveraging Circa to track, report, and reduce their carbon footprint.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Dashboard Visualization</CardTitle>
              <CardDescription>
                Get a complete overview of your organization's emissions with interactive dashboards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md overflow-hidden shadow-md">
                <img 
                  src={dashboardImage}
                  alt="Circa Dashboard" 
                  className="w-full h-auto object-cover"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export default CircaInAction;
