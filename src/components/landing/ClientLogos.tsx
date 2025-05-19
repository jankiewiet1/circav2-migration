
export const ClientLogos = () => {
  // Placeholder for company logos
  const logos = [
    { name: "TechCorp", class: "w-24 h-12" },
    { name: "GreenFuture", class: "w-32 h-12" },
    { name: "EcoSolutions", class: "w-28 h-12" },
    { name: "SustainCo", class: "w-24 h-12" },
    { name: "CleanEnergy", class: "w-32 h-12" }
  ];

  return (
    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 lg:gap-16 opacity-80">
      {logos.map((logo, index) => (
        <div 
          key={index} 
          className={`bg-gray-200 rounded flex items-center justify-center ${logo.class}`}
        >
          <span className="text-gray-500 font-medium">{logo.name}</span>
        </div>
      ))}
    </div>
  );
};
