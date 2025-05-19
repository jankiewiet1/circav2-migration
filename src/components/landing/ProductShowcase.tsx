import { BarChart3, FileText, Layout } from 'lucide-react';

export function ProductShowcase() {
  const cards = [
    {
      title: "Dashboard Overview",
      description: "Complete visibility of your carbon footprint",
      image: "/dashboard.jpg",
      icon: Layout,
      color: "bg-blue-500"
    },
    {
      title: "Emissions Analytics",
      description: "Detailed breakdown of your emissions data",
      image: "/Emissions.jpg",
      icon: BarChart3,
      color: "bg-green-500"
    },
    {
      title: "Report Generation",
      description: "Automated reporting for all frameworks",
      image: "/reports.jpg",
      icon: FileText,
      color: "bg-orange-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className="bg-white rounded-xl shadow-sm overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="p-4 md:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg ${card.color} bg-opacity-10 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${card.color} text-opacity-100`} />
                </div>
                <h3 className="text-lg md:text-xl font-semibold">{card.title}</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">{card.description}</p>
            </div>
            <div className="relative">
              <img
                src={card.image}
                alt={card.title}
                className="w-full object-contain"
                style={{ maxHeight: '400px', width: '100%' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
