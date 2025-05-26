
import { useState, useEffect } from 'react';
import { User } from "@/types";
import { Card, CardContent } from "@/components/ui/card";

interface DashboardGreetingProps {
  user: User | null;
  activityCount: number;
}

export const DashboardGreeting = ({ user, activityCount }: DashboardGreetingProps) => {
  const [greeting, setGreeting] = useState('Welcome back');
  
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good morning');
    } else if (hour < 18) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }
  }, []);

  return (
    <div className="mb-8">
      <h2 className="text-xl font-medium text-gray-600 mb-1">
        {greeting}, {user?.profile?.first_name || 'there'}!
      </h2>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        
        <Card className="bg-circa-green-light border-none shadow-sm">
          <CardContent className="p-3 text-sm">
            <span className="font-medium">{activityCount} new entries</span> added yesterday
          </CardContent>
        </Card>
      </div>
      <p className="text-gray-500 mt-1">
        Your company's emissions insights and activity
      </p>
    </div>
  );
};
