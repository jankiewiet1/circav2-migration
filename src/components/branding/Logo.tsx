import { Link } from "react-router-dom";

interface LogoProps {
  variant?: "light" | "dark";
  withText?: boolean;
  className?: string;
  isLink?: boolean;
}

export const Logo = ({ variant = "dark", withText = true, className = "", isLink = true }: LogoProps) => {
  const textColor = variant === "light" ? "text-white" : "text-gray-900";
  
  // Use a relative path for the logo that works in development and production
  const logoSrc = "/assets/logo.svg";
  
  const logoContent = (
    <div className={`flex items-center ${className}`}>
      <div className="relative w-auto h-8 mr-2">
        <img 
          src={logoSrc}
          alt="Circa Logo" 
          className="w-full h-full object-contain"
        />
      </div>
      {withText && (
        <span className={`text-xl font-bold ${textColor}`}>Circa</span>
      )}
    </div>
  );

  return isLink ? (
    <Link to="/" className="inline-flex">
      {logoContent}
    </Link>
  ) : (
    logoContent
  );
};
