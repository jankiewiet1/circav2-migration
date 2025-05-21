import { Link } from "react-router-dom";

interface LogoProps {
  variant?: "light" | "dark";
  withText?: boolean;
  className?: string;
  isLink?: boolean;
}

export const Logo = ({ variant = "dark", withText = true, className = "", isLink = true }: LogoProps) => {
  const textColor = variant === "light" ? "text-white" : "text-gray-900";
  
  // Use the original logo file
  const logoSrc = "/lovable-uploads/7416a2f2-be9a-4bce-9909-6e9663491308.png";
  
  const logoContent = (
    <div className={`flex items-center ${className}`}>
      <div className="relative w-auto h-14 mr-3">
        <img 
          src={logoSrc}
          alt="Circa Logo" 
          className="w-full h-full object-contain"
        />
      </div>
      {withText && (
        <span className={`text-2xl font-bold ${textColor}`}>Circa</span>
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
