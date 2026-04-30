import { forwardRef } from "react";
import { cn } from "../ui/utils";
import { Search } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "search";
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = "default", icon, ...props }, ref) => {
    if (variant === "search") {
      return (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            ref={ref}
            className={cn(
              "w-full pl-12 pr-4 py-3 bg-white border border-border rounded-xl",
              "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
              "transition-all",
              className
            )}
            {...props}
          />
        </div>
      );
    }

    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full px-4 py-3 bg-input-background border border-border rounded-xl",
            "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
            "transition-all",
            icon && "pl-12",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = "Input";
