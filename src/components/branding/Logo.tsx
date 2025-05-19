import { Link } from "react-router-dom";

interface LogoProps {
  variant?: "light" | "dark";
  withText?: boolean;
  className?: string;
  isLink?: boolean;
}

export const Logo = ({ variant = "dark", withText = true, className = "", isLink = true }: LogoProps) => {
  const textColor = variant === "light" ? "text-white" : "text-gray-900";
  
  const logoContent = (
    <div className="relative w-[70px] h-[70px] mr-1">
      <img 
        src="/lovable-uploads/7416a2f2-be9a-4bce-9909-6e9663491308.png" 
        alt="Circa Logo" 
        className="w-full h-full object-contain"
      />
    </div>
  );

  return (
    isLink ? (
      <Link to="/" className={`flex items-center ${className}`}>
        {logoContent}
        {withText && (
          <span className={`text-xl font-bold ${textColor}`}>Circa</span>
        )}
      </Link>
    ) : (
      <div className={`flex items-center ${className}`}>
        {logoContent}
        {withText && (
          <span className={`text-xl font-bold ${textColor}`}>Circa</span>
        )}
      </div>
    )
  );
};
