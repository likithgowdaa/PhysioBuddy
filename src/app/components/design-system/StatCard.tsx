import { forwardRef } from "react";
import { cn } from "../ui/utils";

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "primary";
}

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, value, label, icon, variant = "default", ...props }, ref) => {
    const variantStyles = {
      default: "text-foreground",
      success: "text-success",
      warning: "text-warning",
      error: "text-error",
      primary: "text-primary",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "bg-white rounded-xl border border-border p-4 text-center transition-all hover:shadow-md",
          className
        )}
        {...props}
      >
        {icon ? (
          <div className={cn("mb-1 flex items-center justify-center", variantStyles[variant])}>
            {icon}
          </div>
        ) : (
          <div className={cn("text-3xl font-bold mb-1", variantStyles[variant])}>
            {value}
          </div>
        )}
        {!icon && <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>}
        {icon && (
          <>
            <div className={cn("text-2xl font-bold mb-1", variantStyles[variant])}>
              {value}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
          </>
        )}
      </div>
    );
  }
);

StatCard.displayName = "StatCard";
