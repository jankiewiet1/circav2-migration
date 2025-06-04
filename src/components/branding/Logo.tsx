import { Link } from "react-router-dom";

interface LogoProps {
  variant?: "light" | "dark";
  withText?: boolean;
  className?: string;
  isLink?: boolean;
}

export const Logo = ({ variant = "dark", withText = true, className = "", isLink = true }: LogoProps) => {
  const textColor = variant === "light" ? "text-white" : "text-gray-900";
  
  // Use the actual user's PNG logo file
  const logoSrc = "/circa-logo.png";
  
  // Check if height/width classes are provided in className
  const hasHeightClass = className.includes('h-');
  const hasWidthClass = className.includes('w-');
  
  // Extract size classes from className for the image container
  const sizeClasses = className.split(' ').filter(cls => 
    cls.startsWith('h-') || cls.startsWith('w-') || cls.startsWith('max-h-') || cls.startsWith('max-w-')
  ).join(' ');
  
  // Remove size classes from outer className to avoid conflicts
  const outerClasses = className.split(' ').filter(cls => 
    !cls.startsWith('h-') && !cls.startsWith('w-') && !cls.startsWith('max-h-') && !cls.startsWith('max-w-')
  ).join(' ');
  
  // Use default height if no height class provided
  const defaultHeight = hasHeightClass ? '' : 'h-16';
  const imageContainerClasses = sizeClasses || (withText ? `w-auto ${defaultHeight}` : 'w-full h-full');
  
  const logoContent = (
    <div className={`flex items-center ${outerClasses}`}>
      <div className={`${imageContainerClasses} ${withText ? 'mr-3' : ''}`}>
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
