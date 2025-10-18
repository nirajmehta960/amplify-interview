import React from "react";
import { cn } from "@/lib/utils";

interface LogoTextProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  variant?: "default" | "gradient";
}

const LogoText: React.FC<LogoTextProps> = ({
  className,
  size = "md",
  showTagline = false,
  variant = "default",
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "text-lg";
      case "lg":
        return "text-3xl";
      case "xl":
        return "text-4xl";
      default:
        return "text-2xl";
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case "gradient":
        return "bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent";
      default:
        return "text-gray-900";
    }
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <span
        className={cn(
          "font-bold font-display",
          getSizeClasses(),
          getTextColor()
        )}
      >
        Amplify Interview
      </span>
      {showTagline && (
        <span
          className={cn(
            "text-sm text-gray-600 -mt-1",
            size === "sm" && "text-xs",
            size === "lg" && "text-base",
            size === "xl" && "text-lg"
          )}
        >
          AI-Powered Mock Interviews
        </span>
      )}
    </div>
  );
};

export default LogoText;
