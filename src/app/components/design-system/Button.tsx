import { forwardRef } from "react";
import { cn } from "../ui/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "error" | "outline" | "ghost";
  size?: "sm" | "md" | "lg" | "xl";
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", icon, children, ...props }, ref) => {
    const variantStyles = {
      primary: "bg-primary text-primary-foreground hover:bg-primary-dark shadow-lg shadow-primary/30",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg shadow-secondary/30",
      success: "bg-success text-success-foreground hover:bg-success/90 shadow-lg shadow-success/30",
      warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-lg shadow-warning/30",
      error: "bg-error text-error-foreground hover:bg-error/90 shadow-lg shadow-error/30",
      outline: "bg-white border-2 border-border text-foreground hover:bg-muted",
      ghost: "bg-transparent text-foreground hover:bg-muted",
    };

    const sizeStyles = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3",
      lg: "px-8 py-4 text-lg",
      xl: "px-12 py-5 text-xl",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "hover:scale-[1.02] active:scale-[0.98]",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {icon && <span>{icon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
