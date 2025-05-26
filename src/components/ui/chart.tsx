
import React, { ReactNode } from 'react';

interface ChartConfig {
  [key: string]: {
    color: string;
    [key: string]: any;
  };
}

interface ChartContainerProps {
  children: ReactNode;
  config: ChartConfig;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({ children, config }) => {
  return <div className="w-full h-full">{children}</div>;
};
