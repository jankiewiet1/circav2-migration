import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Flame, 
  Wind, 
  Truck, 
  BarChart2, 
  LineChart, 
  PieChart, 
  Globe,
  CalendarRange,
  Building2,
  Leaf,
  FileText,
  Settings,
  Calculator,
  Upload
} from 'lucide-react';

type NavItemProps = {
  to: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  subItem?: boolean;
};

const NavItem = ({ to, icon, label, active, subItem }: NavItemProps) => (
  <li>
    <Link
      to={to}
      className={cn(
        "flex items-center px-4 py-2.5 text-sm font-medium rounded-md",
        "transition-all duration-300",
        subItem ? "pl-10" : "",
        active
          ? "bg-white/10 text-white"
          : "text-white/80 hover:bg-white/10 hover:text-white"
      )}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="ml-3 whitespace-nowrap">{label}</span>
    </Link>
  </li>
);

export const EmissionsSidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Navigation groups for the emissions sections
  const myEmissionsGroup = [
    { to: "/emissions/overview", icon: <BarChart2 size={18} />, label: "Overview" },
    { to: "/emissions/by-category", icon: <PieChart size={18} />, label: "By Category" },
    { to: "/emissions/calculate", icon: <Calculator size={18} />, label: "Calculate" },
    { to: "/emissions/data-upload", icon: <Upload size={18} />, label: "Data Upload" },
  ];
  
  const scopesGroup = [
    { to: "/emissions/scope1", icon: <Flame size={18} />, label: "Scope 1" },
    { to: "/emissions/scope2", icon: <Wind size={18} />, label: "Scope 2" },
    { to: "/emissions/scope3", icon: <Truck size={18} />, label: "Scope 3" },
  ];
  
  const analysisGroup = [
    { to: "/emissions/year-over-year", icon: <LineChart size={18} />, label: "Year over Year" },
    { to: "/emissions/subsidiaries", icon: <Building2 size={18} />, label: "Subsidiary Breakdown" },
    { to: "/emissions/actions", icon: <Leaf size={18} />, label: "Actions & Reductions" },
  ];
  
  const reportsGroup = [
    { to: "/emissions/reports", icon: <FileText size={18} />, label: "Reports & Exports" },
    { to: "/emissions/csrd", icon: <Globe size={18} />, label: "ESG Reporting" },
  ];

  return (
    <div className="w-full bg-circa-green-dark text-white">
      <div className="px-4 pt-6 pb-2">
        <h2 className="text-lg font-semibold">Carbon Dashboard</h2>
        <p className="text-sm text-white/60">Emissions monitoring</p>
      </div>
      
      <nav className="py-2">
        <div className="px-4 py-2">
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">My Emissions</h3>
        </div>
        <ul className="space-y-1">
          {myEmissionsGroup.map((item) => (
            <NavItem 
              key={item.to} 
              to={item.to} 
              icon={item.icon} 
              label={item.label} 
              active={currentPath === item.to}
            />
          ))}
        </ul>
        
        <div className="px-4 py-2 mt-4">
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">By Scope</h3>
        </div>
        <ul className="space-y-1">
          {scopesGroup.map((item) => (
            <NavItem 
              key={item.to} 
              to={item.to} 
              icon={item.icon} 
              label={item.label} 
              active={currentPath === item.to}
            />
          ))}
        </ul>
        
        <div className="px-4 py-2 mt-4">
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">Analysis</h3>
        </div>
        <ul className="space-y-1">
          {analysisGroup.map((item) => (
            <NavItem 
              key={item.to} 
              to={item.to} 
              icon={item.icon} 
              label={item.label} 
              active={currentPath === item.to}
            />
          ))}
        </ul>
        
        <div className="px-4 py-2 mt-4">
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">Reporting</h3>
        </div>
        <ul className="space-y-1">
          {reportsGroup.map((item) => (
            <NavItem 
              key={item.to} 
              to={item.to} 
              icon={item.icon} 
              label={item.label} 
              active={currentPath === item.to}
            />
          ))}
        </ul>
        
        <div className="px-4 py-2 mt-4">
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">Settings</h3>
        </div>
        <ul className="space-y-1">
          <NavItem 
            to="/settings" 
            icon={<Settings size={18} />} 
            label="Account Settings" 
            active={currentPath === '/settings'}
          />
        </ul>
      </nav>
    </div>
  );
};
