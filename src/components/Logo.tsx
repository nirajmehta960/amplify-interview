import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "main" | "horizontal" | "square" | "favicon";
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

const Logo: React.FC<LogoProps> = ({
  variant = "main",
  className,
  showText = true,
  size = "md",
}) => {
  const getLogoPath = () => {
    switch (variant) {
      case "horizontal":
        return "/logo-horizontal.svg";
      case "square":
        return "/logo-square.svg";
      case "favicon":
        return "/favicon.svg";
      default:
        return "/logo-compact.svg";
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "h-8 w-auto";
      case "lg":
        return "h-16 w-auto";
      default:
        return "h-12 w-auto";
    }
  };

  if (variant === "square" || variant === "favicon") {
    return (
      <img
        src={getLogoPath()}
        alt="Amplify Interview Logo"
        className={cn(getSizeClasses(), className)}
      />
    );
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <img
        src={getLogoPath()}
        alt="Amplify Interview Logo"
        className={cn(getSizeClasses())}
      />
      {showText && (
        <div className="flex flex-col">
          <span className="text-xl font-bold text-gray-900">
            Amplify Interview
          </span>
          <span className="text-sm text-gray-600 -mt-1">
            AI-Powered Mock Interviews
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
