import { forwardRef } from "react";
import { cn } from "../ui/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "gradient" | "elevated";
  padding?: "none" | "sm" | "md" | "lg";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", padding = "md", children, ...props }, ref) => {
    const variantStyles = {
      default: "bg-card border border-border shadow-md",
      glass: "bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl",
      gradient: "bg-gradient-to-br from-blue-50 to-green-50 border border-border shadow-lg",
      elevated: "bg-card border border-border shadow-xl hover:shadow-2xl transition-shadow",
    };

    const paddingStyles = {
      none: "",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl transition-all",
          variantStyles[variant],
          paddingStyles[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
