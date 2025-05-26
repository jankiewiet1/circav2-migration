
import React from 'react';
import { MainLayout } from '@/components/MainLayout';
import { EmissionsByCategory } from '@/components/emissions/EmissionsByCategory';

const ByCategory = () => {
  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Emissions by Category</h1>
          <p className="text-muted-foreground mt-1">
            Detailed breakdown of emissions sources
          </p>
        </div>
        
        <EmissionsByCategory />
      </div>
    </MainLayout>
  );
};

export default ByCategory;
