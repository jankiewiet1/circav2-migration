import { BarChart3, FileText, Layout } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function ProductShowcase() {
  const { t } = useTranslation();

  const cards = [
    {
      title: t('productShowcase.dashboard.title'),
      description: t('productShowcase.dashboard.description'),
      image: "/dashboard.jpg",
      icon: Layout,
      color: "bg-blue-500"
    },
    {
      title: t('productShowcase.emissions.title'),
      description: t('productShowcase.emissions.description'),
      image: "/Emissions.jpg",
      icon: BarChart3,
      color: "bg-green-500"
    },
    {
      title: t('productShowcase.reports.title'),
      description: t('productShowcase.reports.description'),
      image: "/reports.jpg",
      icon: FileText,
      color: "bg-orange-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-8 md:gap-12">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div 
            key={index} 
            className="bg-white rounded-xl shadow-lg overflow-hidden group hover:shadow-xl transition-all duration-300 border border-gray-200 transform hover:-translate-y-1"
          >
            {/* Browser Window Mockup */}
            <div className="relative">
              <div className="bg-gray-100 h-8 flex items-center px-3 space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <div className="absolute top-[7px] left-1/2 transform -translate-x-1/2 bg-white/90 rounded-md px-2 py-0.5 text-xs text-gray-500 font-medium">
                  circa.earth
                </div>
              </div>
              <div className="relative overflow-hidden" style={{ height: "240px" }}>
                <img
                  src={card.image}
                  alt={card.title}
                  className="w-full object-cover object-top transform group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent group-hover:opacity-0 transition-opacity"></div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex items-start gap-4 mb-3">
                <div className={`flex-shrink-0 w-12 h-12 rounded-lg ${card.color} bg-opacity-10 flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 text-${card.color.replace('bg-', '')}`} />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">{card.title}</h3>
                  <p className="text-gray-600">{card.description}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
