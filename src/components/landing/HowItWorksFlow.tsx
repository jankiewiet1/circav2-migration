import { useTranslation } from 'react-i18next';
import { Upload, Sparkles, BarChart3, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

export function HowItWorksFlow() {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);

  // Set up scroll tracking for the flow visualization
  useEffect(() => {
    const handleScroll = () => {
      const steps = document.querySelectorAll('.step-section');
      
      steps.forEach((step, index) => {
        const rect = step.getBoundingClientRect();
        // When the step is in the middle of the viewport, set it as active
        if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
          setActiveStep(index);
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const steps = [
    {
      title: t('howItWorks.steps.upload.title'),
      description: t('howItWorks.steps.upload.description'),
      icon: Upload
    },
    {
      title: t('howItWorks.steps.match.title'),
      description: t('howItWorks.steps.match.description'),
      icon: Sparkles
    },
    {
      title: t('howItWorks.steps.insights.title'),
      description: t('howItWorks.steps.insights.description'),
      icon: BarChart3
    },
    {
      title: t('howItWorks.steps.reports.title'),
      description: t('howItWorks.steps.reports.description'),
      icon: FileText
    }
  ];

  return (
    <div className="relative w-full max-w-5xl mx-auto">
      {/* Dynamic center guide line with animated gradient */}
      <div className="absolute left-1/2 top-0 bottom-0 w-2.5 bg-gray-100 -translate-x-1/2 z-0 md:block hidden">
        {/* Progress overlay that grows based on scroll position */}
        <div 
          className="absolute top-0 w-full bg-gradient-to-b from-blue-300 via-green-300 to-orange-300 transition-all duration-300"
          style={{ 
            height: `${Math.min(100, (activeStep / (steps.length - 1)) * 100)}%`,
          }}
        />
      </div>
      
      <div className="flex flex-col gap-36">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isEven = index % 2 === 0;
          
          return (
            <div key={index} className="relative step-section" id={`step-${index}`}>
              {/* Highlight indicator on the guide line */}
              <div className={`absolute left-1/2 -translate-x-1/2 top-1/2 -mt-6 h-4 w-4 rounded-full bg-white z-10 md:block hidden transition-all duration-300 ${activeStep >= index ? 'border-4 border-circa-green shadow-glow' : 'border-2 border-gray-300'}`} />
              
              <div className={`flex flex-col md:flex-row items-center ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} gap-16 md:gap-48`}>
                {/* Text content */}
                <div className={`md:w-2/5 flex flex-col ${isEven ? 'md:items-end md:text-right' : 'md:items-start md:text-left'} items-center text-center`}>
                  <h3 className="text-2xl font-bold mb-3 text-gray-900">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 max-w-md text-lg">
                    {step.description}
                  </p>
                </div>
                
                {/* Icon with background */}
                <div className={`flex items-center justify-center md:w-2/5 ${isEven ? 'md:justify-start' : 'md:justify-end'}`}>
                  <div 
                    className={`relative transform transition-all duration-500 hover:scale-105 ${activeStep >= index ? 'scale-100 opacity-100' : 'scale-95 opacity-80'}`}
                  >
                    <div className="absolute -inset-8 rounded-full bg-green-50/70"></div>
                    <div className="h-24 w-24 md:h-32 md:w-32 rounded-full bg-white border border-green-100 flex items-center justify-center shadow-xl relative">
                      <Icon className="h-12 w-12 md:h-16 md:w-16 text-circa-green" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
