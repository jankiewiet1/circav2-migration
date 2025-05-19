import { useEffect, useRef, useState } from 'react';
import { Upload, Sparkles, BarChart3, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function HowItWorksFlow() {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);
  const stepsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = stepsRef.current.findIndex(ref => ref === entry.target);
            if (index !== -1) {
              setActiveStep(index);
            }
          }
        });
      },
      {
        threshold: 0.6,
        rootMargin: '-20% 0px -20% 0px'
      }
    );

    stepsRef.current.forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const steps = [
    {
      title: t('howItWorks.uploadData'),
      description: t('howItWorks.uploadDataSubtitle'),
      icon: Upload,
      color: "bg-blue-500"
    },
    {
      title: t('howItWorks.autoMatch'),
      description: t('howItWorks.autoMatchSubtitle'),
      icon: Sparkles,
      color: "bg-purple-500"
    },
    {
      title: t('howItWorks.insights'),
      description: t('howItWorks.insightsSubtitle'),
      icon: BarChart3,
      color: "bg-green-500"
    },
    {
      title: t('howItWorks.reports'),
      description: t('howItWorks.reportsSubtitle'),
      icon: FileText,
      color: "bg-orange-500"
    }
  ];

  return (
    <div className="relative w-full">
      {/* Progress Line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gray-200 transform -translate-x-1/2 hidden md:block">
        <div 
          className="absolute top-0 w-full bg-circa-green transition-all duration-500 ease-out"
          style={{ height: `${((activeStep + 1) * 100) / steps.length}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-24 md:space-y-40 lg:space-y-48 xl:space-y-56 relative">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index <= activeStep;
          
          return (
            <div
              key={index}
              ref={(el) => { stepsRef.current[index] = el; }}
              className={`flex flex-col md:flex-row items-center gap-8 md:gap-20 lg:gap-32 xl:gap-40 transition-all duration-500 ${
                isActive ? 'opacity-100' : 'opacity-50'
              }`}
            >
              {/* Left Content - Shown on even indexes */}
              {index % 2 === 0 && (
                <div className="flex-1 text-right hidden md:block">
                  <h3 className={`text-2xl font-semibold mb-2 ${isActive ? 'text-circa-green' : ''}`}>
                    {step.title}
                  </h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              )}

              {/* Icon */}
              <div className={`relative flex items-center justify-center ${isActive ? 'scale-110' : ''} transition-transform duration-500`}>
                <div className={`w-16 h-16 rounded-full ${isActive ? 'bg-circa-green' : 'bg-gray-200'} flex items-center justify-center transition-colors duration-500`}>
                  <Icon className={`w-8 h-8 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                </div>
                {/* Step number */}
                <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full ${isActive ? 'bg-circa-green-dark' : 'bg-gray-400'} text-white text-sm flex items-center justify-center`}>
                  {index + 1}
                </div>
              </div>

              {/* Right Content - Shown on odd indexes */}
              {index % 2 !== 0 && (
                <div className="flex-1 hidden md:block">
                  <h3 className={`text-2xl font-semibold mb-2 ${isActive ? 'text-circa-green' : ''}`}>
                    {step.title}
                  </h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              )}

              {/* Mobile Content */}
              <div className="text-center md:hidden">
                <h3 className={`text-2xl font-semibold mb-2 ${isActive ? 'text-circa-green' : ''}`}>
                  {step.title}
                </h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
