
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="h-24 w-24 rounded-full bg-circa-green-light flex items-center justify-center">
            <FileQuestion className="h-12 w-12 text-circa-green" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900">404</h1>
        <p className="text-xl text-gray-600 mt-2 mb-6">Page not found</p>
        <p className="text-gray-500 mb-8">
          We couldn't find the page you're looking for. It might have been moved or doesn't exist.
        </p>
        <Button asChild className="bg-circa-green hover:bg-circa-green-dark">
          <Link to="/dashboard">
            Return to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
