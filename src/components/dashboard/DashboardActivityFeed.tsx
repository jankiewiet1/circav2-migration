
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface DashboardActivityFeedProps {
  loading: boolean;
}

export const DashboardActivityFeed = ({ loading }: DashboardActivityFeedProps) => {
  // Mock data for recent emissions
  const recentEmissions = [
    {
      id: "e1",
      date: "2025-04-22",
      category: "Natural Gas",
      quantity: 150,
      unit: "m³",
      scope: 1,
      status: "matched" // matched, fuzzy-matched, unmatched
    },
    {
      id: "e2",
      date: "2025-04-21",
      category: "Diesel",
      quantity: 75,
      unit: "L",
      scope: 1,
      status: "matched"
    },
    {
      id: "e3",
      date: "2025-04-20",
      category: "Electricity",
      quantity: 1200,
      unit: "kWh",
      scope: 2,
      status: "fuzzy-matched"
    },
    {
      id: "e4",
      date: "2025-04-19",
      category: "Business Travel",
      quantity: 450,
      unit: "km",
      scope: 3,
      status: "unmatched"
    },
    {
      id: "e5",
      date: "2025-04-18",
      category: "Waste Disposal",
      quantity: 30,
      unit: "kg",
      scope: 3,
      status: "matched"
    }
  ];
  
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'matched':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">🟢 Matched</Badge>;
      case 'fuzzy-matched':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">🟠 Fuzzy-matched</Badge>;
      case 'unmatched':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">🔴 Unmatched</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Latest Activity</CardTitle>
        <CardDescription>Recent emission entries added to your company</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentEmissions.map((emission) => (
                <TableRow key={emission.id}>
                  <TableCell>{new Date(emission.date).toLocaleDateString()}</TableCell>
                  <TableCell>{emission.category}</TableCell>
                  <TableCell>{emission.quantity} {emission.unit}</TableCell>
                  <TableCell>{getStatusBadge(emission.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/emissions/scope${emission.scope}`}>
                        Go to Scope {emission.scope}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CardFooter className="flex justify-end border-t pt-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/data-upload">
            View All Activity
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
