import React from 'react';
import { useTranslation } from 'react-i18next';

export const ValueProposition = () => {
  const { t } = useTranslation();
  
  const stats = [
    {
      value: "80%",
      label: t('stats.timeSaved'),
      description: t('stats.timeSavedDetail')
    },
    {
      value: "€50K+",
      label: t('stats.annualSavings'),
      description: t('stats.annualSavingsDetail')
    },
    {
      value: "100%",
      label: t('stats.auditReady'),
      description: t('stats.auditReadyDetail')
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-16 lg:gap-24 xl:gap-32 mx-auto w-full max-w-[1400px]">
      {stats.map((stat, index) => (
        <div key={index} className="text-center">
          <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-circa-green-dark mb-2">
            {stat.value}
          </div>
          <div className="text-xl font-semibold mb-1">{stat.label}</div>
          <div className="text-gray-600">{stat.description}</div>
        </div>
      ))}
    </div>
  );
};
