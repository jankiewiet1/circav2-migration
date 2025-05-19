
import { Progress } from "@/components/ui/progress";

export const SignupProgress = () => {
  const totalUsers = 1000;
  const currentUsers = 213;
  const progress = (currentUsers / totalUsers) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-2 text-gray-600">
        <span>{currentUsers} companies joined</span>
        <span>{totalUsers - currentUsers} spots remaining</span>
      </div>
      <Progress value={progress} className="h-3 bg-circa-green-light">
        <div className="relative">
          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-circa-green font-medium">
            {Math.round(progress)}%
          </span>
        </div>
      </Progress>
    </div>
  );
};
