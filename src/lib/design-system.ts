// Design System Constants for Consistent UI
export const DESIGN_SYSTEM = {
  // Animation Durations
  durations: {
    fast: "duration-200",
    normal: "duration-300",
    slow: "duration-500",
  },

  // Transition Classes
  transitions: {
    all: "transition-all",
    colors: "transition-colors",
    transform: "transition-transform",
    opacity: "transition-opacity",
  },

  // Hover Effects
  hover: {
    scale: "hover:scale-105",
    scaleUp: "hover:scale-110",
    scaleDown: "hover:scale-95",
    lift: "hover:-translate-y-1",
    liftMore: "hover:-translate-y-2",
    shadow: "hover:shadow-lg",
    shadowProfessional: "hover:shadow-professional-lg",
    border: "hover:border-primary-blue/30",
    background: "hover:bg-primary-blue/5",
    text: "hover:text-primary-blue",
  },

  // Motion Configurations
  motion: {
    fadeIn: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    slideUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
    },
    slideDown: {
      initial: { opacity: 0, y: -20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 20 },
    },
    slideLeft: {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -20 },
    },
    slideRight: {
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 20 },
    },
    scale: {
      initial: { opacity: 0, scale: 0.8 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.8 },
    },
    stagger: {
      container: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
      },
      item: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
      },
    },
  },

  // Interactive States
  interactive: {
    whileHover: { scale: 1.02, y: -2 },
    whileTap: { scale: 0.98 },
    whileHoverSubtle: { scale: 1.05 },
    whileTapSubtle: { scale: 0.95 },
  },

  // Color Scheme
  colors: {
    primary: "primary-blue",
    primaryHover: "primary-blue/90",
    primaryLight: "primary-blue/5",
    primaryBorder: "primary-blue/30",
    accent: "accent-green",
    accentHover: "accent-green/90",
    accentLight: "accent-green/5",
    accentBorder: "accent-green/30",
    success: "text-green-600",
    warning: "text-amber-600",
    error: "text-red-600",
    muted: "text-muted-foreground",
  },

  // Shadow System
  shadows: {
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg",
    professional: "shadow-professional",
    professionalLg: "shadow-professional-lg",
  },

  // Border Radius
  radius: {
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    professional: "rounded-professional",
    full: "rounded-full",
  },

  // Spacing
  spacing: {
    xs: "space-y-1",
    sm: "space-y-2",
    md: "space-y-3",
    lg: "space-y-4",
    xl: "space-y-6",
  },

  // Card Styles
  card: {
    base: "bg-white/90 backdrop-blur-sm border border-light-gray/50 rounded-professional",
    hover: "hover:shadow-professional-lg transition-all duration-300 group",
    interactive: "cursor-pointer hover:border-primary-blue/30",
  },

  // Button Styles
  button: {
    primary:
      "bg-primary-blue hover:bg-primary-blue/90 text-white shadow-professional hover:shadow-professional-lg transition-all duration-300",
    secondary:
      "bg-white/50 border-light-gray/50 hover:bg-primary-blue/5 hover:border-primary-blue/30 hover:text-primary-blue transition-all duration-300",
    ghost:
      "hover:bg-primary-blue/10 hover:text-primary-blue transition-all duration-300",
  },

  // Form Elements
  form: {
    input:
      "transition-all duration-300 focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue",
    select:
      "transition-all duration-300 focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue",
    textarea:
      "transition-all duration-300 focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue",
  },
};

// Helper function to combine classes
export const cn = (
  ...classes: (string | undefined | null | false)[]
): string => {
  return classes.filter(Boolean).join(" ");
};

// Helper function for motion variants
export const createMotionVariant = (
  type: keyof typeof DESIGN_SYSTEM.motion
) => {
  return DESIGN_SYSTEM.motion[type];
};

// Helper function for interactive states
export const createInteractiveState = (
  type: keyof typeof DESIGN_SYSTEM.interactive
) => {
  return DESIGN_SYSTEM.interactive[type];
};
