import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Coins, Shield } from 'lucide-react';

export const ValueProposition = () => {
  const { t } = useTranslation();
  
  const stats = [
    {
      value: t('stats.timeSaved.value'),
      label: t('stats.timeSaved.label'),
      description: t('stats.timeSaved.description'),
      icon: Clock,
      color: "bg-blue-100 text-blue-600"
    },
    {
      value: t('stats.annualSavings.value'),
      label: t('stats.annualSavings.label'),
      description: t('stats.annualSavings.description'),
      icon: Coins,
      color: "bg-green-100 text-green-600"
    },
    {
      value: t('stats.auditReady.value'),
      label: t('stats.auditReady.label'),
      description: t('stats.auditReady.description'),
      icon: Shield,
      color: "bg-orange-100 text-orange-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-16 mx-auto w-full max-w-[1400px]">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div 
            key={index} 
            className="flex flex-col items-center text-center px-8 py-10 bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-all transform hover:-translate-y-1"
          >
            <div className={`w-20 h-20 rounded-full ${stat.color} mb-6 flex items-center justify-center shadow-md`}>
              <Icon className="h-10 w-10" />
            </div>
            
            <div className="flex flex-col items-center">
              <div className="text-5xl font-bold mb-3 bg-gradient-to-r from-circa-green to-blue-500 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-xl font-semibold mb-2">{stat.label}</div>
              <div className="text-gray-600 max-w-xs">{stat.description}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
