import React from "react";
import { cn } from "@/lib/utils";

interface LogoIconProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const LogoIcon: React.FC<LogoIconProps> = ({ className, size = "md" }) => {
  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "h-8 w-8";
      case "lg":
        return "h-16 w-16";
      default:
        return "h-12 w-12";
    }
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <img
        src="/favicon.svg"
        alt="Amplify Interview Logo"
        className={cn(getSizeClasses())}
      />
    </div>
  );
};

export default LogoIcon;
